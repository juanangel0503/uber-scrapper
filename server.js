import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Background scraping status tracking
const scrapingJobs = new Map();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Configure timeouts to prevent 504 Gateway Timeout errors
app.use((req, res, next) => {
  // Set request timeout to 5 minutes for scraping operations
  req.setTimeout(300000, () => {
    console.log('⏰ Request timeout after 5 minutes');
    if (!res.headersSent) {
      res.status(504).json({
        success: false,
        error: 'Request timeout',
        message: 'Scraping operation took too long. Try again or use cached data.'
      });
    }
  });
  
  // Set response timeout
  res.setTimeout(300000, () => {
    console.log('⏰ Response timeout after 5 minutes');
    if (!res.headersSent) {
      res.status(504).json({
        success: false,
        error: 'Response timeout',
        message: 'Server took too long to respond.'
      });
    }
  });
  
  next();
});

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

  // Il Caminetto Direct Scrape & Download (GET method)
  router.get('/scrapers/ilcaminetto/scrape-download', async (req, res) => {
    try {
      const { url } = req.query;
      if (!url) {
        return res.status(400).json({
          success: false,
          error: 'URL is required',
          message: 'Please provide a URL as query parameter: ?url=YOUR_URL'
        });
      }

      console.log(`🚀 Starting Il Caminetto scraping for URL: ${url}`);
      const { ilcaminettoScraper } = await import('./ilcaminetto_scraper.js');
      const result = await ilcaminettoScraper(url);
      
      // Check if the scraper saved the data to file
      const menuPath = path.join(__dirname, 'ilcaminetto_menu.json');
      if (fs.existsSync(menuPath)) {
        const menuData = JSON.parse(fs.readFileSync(menuPath, 'utf8'));
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `ilcaminetto-${timestamp}.json`;
        
        console.log(`✅ Scraping completed. Downloading ${filename}`);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.json({
          success: true,
          scraped_url: url,
          scraped_at: new Date().toISOString(),
          filename: filename,
          total_items: menuData.length,
          data: menuData
        });
      } else {
        // If file wasn't created, return the result directly
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `ilcaminetto-${timestamp}.json`;
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.json({
          success: true,
          scraped_url: url,
          scraped_at: new Date().toISOString(),
          filename: filename,
          data: result
        });
      }
    } catch (error) {
      console.error('❌ Scraping failed:', error.message);
      res.status(500).json({
        success: false,
        error: 'Scraping failed',
        message: error.message
      });
    }
  });

  router.post('/scrapers/ilcaminetto/scrape', async (req, res) => {
    try {
      const { url } = req.body;
      const jobId = `ilcaminetto_${Date.now()}`;
      
      // Start background scraping job
      scrapingJobs.set(jobId, {
        status: 'running',
        startTime: new Date().toISOString(),
        scraper: 'ilcaminetto',
        url: url || 'http://orders.ilcaminetto.com.au/'
      });
      
      // Immediately return job ID without waiting for completion
      res.json({
        success: true,
        message: 'Scraping started in background',
        jobId: jobId,
        statusEndpoint: `/api/v1/scrapers/status/${jobId}`,
        estimatedTime: '2-3 minutes'
      });
      
      // Run scraping in background
      (async () => {
        try {
          console.log(`🚀 Background scraping job ${jobId} started`);
          const { ilcaminettoScraper } = await import('./ilcaminetto_scraper.js');
          const result = await ilcaminettoScraper(url);
          
          scrapingJobs.set(jobId, {
            ...scrapingJobs.get(jobId),
            status: 'completed',
            completedTime: new Date().toISOString(),
            result: result
          });
          console.log(`✅ Background scraping job ${jobId} completed`);
        } catch (error) {
          scrapingJobs.set(jobId, {
            ...scrapingJobs.get(jobId),
            status: 'failed',
            completedTime: new Date().toISOString(),
            error: error.message
          });
          console.log(`❌ Background scraping job ${jobId} failed: ${error.message}`);
        }
      })();
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to start scraping job',
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

  // Uber Direct Scrape & Download (GET method)
  router.get('/scrapers/uber/scrape-download', async (req, res) => {
    try {
      const { url } = req.query;
      if (!url) {
        return res.status(400).json({
          success: false,
          error: 'URL is required',
          message: 'Please provide a URL as query parameter: ?url=YOUR_URL'
        });
      }

      console.log(` Starting Uber Eats scraping for URL: ${url}`);
      const { uberScraper } = await import('./uber_scraper.js');
      const result = await uberScraper(url);
      
      // Check if the scraper saved the data to file
      const menuPath = path.join(__dirname, 'uber_menu.json');
      if (fs.existsSync(menuPath)) {
        const menuData = JSON.parse(fs.readFileSync(menuPath, 'utf8'));
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `uber-${timestamp}.json`;
        
        console.log(`✅ Scraping completed. Downloading ${filename}`);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.json({
          success: true,
          scraped_url: url,
          scraped_at: new Date().toISOString(),
          filename: filename,
          total_items: menuData.length,
          data: menuData
        });
      } else {
        // If file wasn't created, return the result directly
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `uber-${timestamp}.json`;
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.json({
          success: true,
          scraped_url: url,
          scraped_at: new Date().toISOString(),
          filename: filename,
          data: result
        });
      }
    } catch (error) {
      console.error('❌ Scraping failed:', error.message);
      res.status(500).json({
        success: false,
        error: 'Scraping failed',
        message: error.message
      });
    }
  });

  router.post('/scrapers/uber/scrape', async (req, res) => {
    try {
      const { url } = req.body;
      const jobId = `uber_${Date.now()}`;
      
      // Start background scraping job
      scrapingJobs.set(jobId, {
        status: 'running',
        startTime: new Date().toISOString(),
        scraper: 'uber',
        url: url || 'default-uber-url'
      });
      
      // Immediately return job ID without waiting for completion
      res.json({
        success: true,
        message: 'Scraping started in background',
        jobId: jobId,
        statusEndpoint: `/api/v1/scrapers/status/${jobId}`,
        estimatedTime: '5-10 minutes'
      });
      
      // Run scraping in background
      (async () => {
        try {
          console.log(`🚀 Background scraping job ${jobId} started`);
          const { uberScraper } = await import('./uber_scraper.js');
          const result = await uberScraper(url);
          
          scrapingJobs.set(jobId, {
            ...scrapingJobs.get(jobId),
            status: 'completed',
            completedTime: new Date().toISOString(),
            result: result
          });
          console.log(`✅ Background scraping job ${jobId} completed`);
        } catch (error) {
          scrapingJobs.set(jobId, {
            ...scrapingJobs.get(jobId),
            status: 'failed',
            completedTime: new Date().toISOString(),
            error: error.message
          });
          console.log(`❌ Background scraping job ${jobId} failed: ${error.message}`);
        }
      })();
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to start scraping job',
        message: error.message
      });
    }
  });

  // Scraping job status endpoint
  router.get('/scrapers/status/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = scrapingJobs.get(jobId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
        message: 'The specified job ID does not exist or has expired.'
      });
    }
    
    const response = {
      success: true,
      jobId: jobId,
      status: job.status,
      scraper: job.scraper,
      url: job.url,
      startTime: job.startTime
    };
    
    if (job.status === 'completed') {
      response.completedTime = job.completedTime;
      response.result = job.result;
      response.downloadUrl = `/api/v1/scrapers/${job.scraper}/download`;
    } else if (job.status === 'failed') {
      response.completedTime = job.completedTime;
      response.error = job.error;
    } else if (job.status === 'running') {
      const elapsed = Date.now() - new Date(job.startTime).getTime();
      response.elapsedTime = `${Math.floor(elapsed / 1000)}s`;
      response.message = 'Scraping in progress...';
    }
    
    res.json(response);
  });
  
  // List all active jobs
  router.get('/scrapers/jobs', (req, res) => {
    const jobs = Array.from(scrapingJobs.entries()).map(([jobId, job]) => ({
      jobId,
      ...job
    }));
    
    res.json({
      success: true,
      totalJobs: jobs.length,
      runningJobs: jobs.filter(j => j.status === 'running').length,
      completedJobs: jobs.filter(j => j.status === 'completed').length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
      jobs: jobs
    });
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
  console.log(`⚡ Direct Scrape & Download APIs ready!`);
  console.log(` Scrapers will save data to JSON files and then download them`);
});

export default app;