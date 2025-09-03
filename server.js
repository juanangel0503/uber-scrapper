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
      scriptSrc: ["'self'", "'unsafe-inline'"],
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

  // Il Caminetto JSON Download
  router.get('/scrapers/ilcaminetto/download', (req, res) => {
    try {
      const menuPath = path.join(__dirname, 'ilcaminetto_menu.json');
      if (fs.existsSync(menuPath)) {
        const menuData = JSON.parse(fs.readFileSync(menuPath, 'utf8'));
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `ilcaminetto-menu-${timestamp}.json`;
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.json(menuData);
      } else {
        res.status(404).json({
          success: false,
          error: 'Menu data not found. Run the scraper first.'
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Error downloading menu data',
        message: error.message
      });
    }
  });

  // Il Caminetto Direct Scrape & Download
  router.post('/scrapers/ilcaminetto/scrape-download', async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({
          success: false,
          error: 'URL is required',
          message: 'Please provide a URL in the request body'
        });
      }

      const { ilcaminettoScraper } = await import('./ilcaminetto_scraper.js');
      const result = await ilcaminettoScraper(url);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `ilcaminetto-${timestamp}.json`;
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json({
        success: true,
        scraped_url: url,
        scraped_at: new Date().toISOString(),
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

  router.post('/scrapers/ilcaminetto/scrape', async (req, res) => {
    try {
      const { ilcaminettoScraper } = await import('./ilcaminetto_scraper.js');
      const { url } = req.body;
      const result = await ilcaminettoScraper(url);
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

  // Uber JSON Download
  router.get('/scrapers/uber/download', (req, res) => {
    try {
      const menuPath = path.join(__dirname, 'uber_menu.json');
      if (fs.existsSync(menuPath)) {
        const menuData = JSON.parse(fs.readFileSync(menuPath, 'utf8'));
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `uber-menu-${timestamp}.json`;
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.json(menuData);
      } else {
        res.status(404).json({
          success: false,
          error: 'Menu data not found. Run the scraper first.'
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Error downloading menu data',
        message: error.message
      });
    }
  });

  // Uber Direct Scrape & Download
  router.post('/scrapers/uber/scrape-download', async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({
          success: false,
          error: 'URL is required',
          message: 'Please provide a URL in the request body'
        });
      }

      const { uberScraper } = await import('./uber_scraper.js');
      const result = await uberScraper(url);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `uber-${timestamp}.json`;
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json({
        success: true,
        scraped_url: url,
        scraped_at: new Date().toISOString(),
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

  router.post('/scrapers/uber/scrape', async (req, res) => {
    try {
      const { uberScraper } = await import('./uber_scraper.js');
      const { url } = req.body;
      const result = await uberScraper(url);
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

  // Combined JSON Download (All scrapers)
  router.get('/download/all', (req, res) => {
    try {
      const ilcaminettoPath = path.join(__dirname, 'ilcaminetto_menu.json');
      const uberPath = path.join(__dirname, 'uber_menu.json');
      
      const combinedData = {
        scraped_at: new Date().toISOString(),
        scrapers: {}
      };

      // Add Il Caminetto data if exists
      if (fs.existsSync(ilcaminettoPath)) {
        combinedData.scrapers.ilcaminetto = JSON.parse(fs.readFileSync(ilcaminettoPath, 'utf8'));
      }

      // Add Uber data if exists
      if (fs.existsSync(uberPath)) {
        combinedData.scrapers.uber = JSON.parse(fs.readFileSync(uberPath, 'utf8'));
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `all-menus-${timestamp}.json`;
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json(combinedData);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Error downloading combined menu data',
        message: error.message
      });
    }
  });

  return router;
}

// Start server
app.listen(PORT, () => {
  console.log(` API Server running on port ${PORT}`);
  console.log(` API Documentation: http://localhost:${PORT}/api/v1/scrapers`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
  console.log(`📥 JSON Downloads: http://localhost:${PORT}/api/v1/download/all`);
  console.log(`⚡ Direct Scrape & Download APIs added!`);
});

export default app;