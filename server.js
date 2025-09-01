import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.static('public'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/v1', createApiRoutes());

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: err.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: 'Endpoint not found' 
  });
});

function createApiRoutes() {
  const router = express.Router();

  // Get all available scrapers
  router.get('/scrapers', (req, res) => {
    res.json({
      scrapers: [
        {
          id: 'ilcaminetto',
          name: 'Il Caminetto Italian Restaurant',
          description: 'Italian restaurant menu scraper',
          endpoints: {
            menu: '/api/v1/scrapers/ilcaminetto/menu',
            scrape: '/api/v1/scrapers/ilcaminetto/scrape'
          }
        },
        {
          id: 'uber',
          name: 'Uber Eats',
          description: 'Uber Eats restaurant menu scraper',
          endpoints: {
            menu: '/api/v1/scrapers/uber/menu',
            scrape: '/api/v1/scrapers/uber/scrape'
          }
        }
      ]
    });
  });

  // Il Caminetto routes
  router.get('/scrapers/ilcaminetto/menu', (req, res) => {
    try {
      const menuPath = path.join(__dirname, 'ilcaminetto_menu.json');
      if (fs.existsSync(menuPath)) {
        const menuData = JSON.parse(fs.readFileSync(menuPath, 'utf8'));
        res.json({
          success: true,
          data: menuData,
          lastUpdated: fs.statSync(menuPath).mtime.toISOString(),
          totalItems: menuData.length
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Menu data not found. Run the scraper first.'
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Error reading menu data',
        message: error.message
      });
    }
  });

  router.post('/scrapers/ilcaminetto/scrape', async (req, res) => {
    try {
      const { ilcaminettoScraper } = await import('./ilcaminetto_scraper.js');
      const result = await ilcaminettoScraper();
      res.json({
        success: true,
        message: 'Scraping completed successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Scraping failed',
        message: error.message
      });
    }
  });

  // Uber routes
  router.get('/scrapers/uber/menu', (req, res) => {
    try {
      const menuPath = path.join(__dirname, 'uber_menu.json');
      if (fs.existsSync(menuPath)) {
        const menuData = JSON.parse(fs.readFileSync(menuPath, 'utf8'));
        res.json({
          success: true,
          data: menuData,
          lastUpdated: fs.statSync(menuPath).mtime.toISOString(),
          totalItems: menuData.length
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Menu data not found. Run the scraper first.'
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Error reading menu data',
        message: error.message
      });
    }
  });

  router.post('/scrapers/uber/scrape', async (req, res) => {
    try {
      const { uberScraper } = await import('./uber_scraper.js');
      const result = await uberScraper();
      res.json({
        success: true,
        message: 'Scraping completed successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Scraping failed',
        message: error.message
      });
    }
  });

  // Search and filter endpoints
  router.get('/search', (req, res) => {
    try {
      const { query, scraper, category, maxPrice, dietary } = req.query;
      
      // Determine which menu to search
      let menuPath;
      if (scraper === 'uber') {
        menuPath = path.join(__dirname, 'uber_menu.json');
      } else {
        menuPath = path.join(__dirname, 'ilcaminetto_menu.json');
      }

      if (!fs.existsSync(menuPath)) {
        return res.status(404).json({
          success: false,
          error: 'Menu data not found'
        });
      }

      let menuData = JSON.parse(fs.readFileSync(menuPath, 'utf8'));

      // Apply filters
      if (query) {
        const searchTerm = query.toLowerCase();
        menuData = menuData.filter(item => 
          item.name.toLowerCase().includes(searchTerm) ||
          (item.description && item.description.toLowerCase().includes(searchTerm))
        );
      }

      if (category) {
        menuData = menuData.filter(item => 
          item.category.toLowerCase() === category.toLowerCase()
        );
      }

      if (maxPrice) {
        const maxPriceNum = parseFloat(maxPrice.replace('$', ''));
        menuData = menuData.filter(item => {
          const itemPrice = parseFloat(item.price.replace('$', ''));
          return itemPrice <= maxPriceNum;
        });
      }

      if (dietary) {
        const dietaryTerms = dietary.toLowerCase().split(',');
        menuData = menuData.filter(item => 
          item.dietary && item.dietary.some(diet => 
            dietaryTerms.some(term => diet.toLowerCase().includes(term))
          )
        );
      }

      res.json({
        success: true,
        data: menuData,
        totalResults: menuData.length,
        filters: { query, scraper, category, maxPrice, dietary }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Search failed',
        message: error.message
      });
    }
  });

  // Get categories
  router.get('/categories/:scraper', (req, res) => {
    try {
      const { scraper } = req.params;
      let menuPath;
      
      if (scraper === 'uber') {
        menuPath = path.join(__dirname, 'uber_menu.json');
      } else {
        menuPath = path.join(__dirname, 'ilcaminetto_menu.json');
      }

      if (!fs.existsSync(menuPath)) {
        return res.status(404).json({
          success: false,
          error: 'Menu data not found'
        });
      }

      const menuData = JSON.parse(fs.readFileSync(menuPath, 'utf8'));
      const categories = [...new Set(menuData.map(item => item.category))];

      res.json({
        success: true,
        data: categories,
        totalCategories: categories.length
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get categories',
        message: error.message
      });
    }
  });

  return router;
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API Server running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/v1/scrapers`);
  console.log(`🔍 Health Check: http://localhost:${PORT}/health`);
});

export default app;
