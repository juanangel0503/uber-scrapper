# 🚀 BrightData Scraper API

A comprehensive restaurant menu scraping solution with a RESTful API for accessing scraped data from various sources including Il Caminetto Italian Restaurant and Uber Eats.

## ✨ Features

- **Multiple Scrapers**: Support for different restaurant platforms
- **RESTful API**: Easy-to-use HTTP endpoints for data access
- **Real-time Data**: Fresh menu data from live websites
- **Search & Filter**: Advanced querying capabilities
- **Clean Data**: No artificial fields - only authentic source data
- **Production Ready**: Built with Express.js, security middleware, and error handling

## 🏗️ Architecture

```
├── server.js                 # Main API server
├── ilcaminetto_scraper.js   # Il Caminetto Italian Restaurant scraper
├── uber_scraper.js          # Uber Eats scraper
├── ilcaminetto_menu.json    # Scraped Il Caminetto data
├── uber_menu.json           # Scraped Uber Eats data
└── API_DOCUMENTATION.md     # Complete API reference
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the API Server
```bash
npm start
```

The API will be available at `http://localhost:3000`

### 3. Access the Web UI
Open your browser and navigate to:
```
http://localhost:3000
```

The web interface provides:
- **Real-time API testing**
- **Interactive dashboard**
- **JSON response display**
- **Search and filter tools**
- **Scraper execution controls**

### 4. Run Scrapers (Optional)
```bash
# Scrape Il Caminetto
npm run scrape:ilcaminetto

# Scrape Uber Eats
npm run scrape:uber
```

## 📚 API Endpoints

### Core Endpoints
- `GET /health` - Server health check
- `GET /api/v1/scrapers` - List available scrapers
- `GET /api/v1/scrapers/:id/menu` - Get menu data
- `POST /api/v1/scrapers/:id/scrape` - Run scraper
- `GET /api/v1/search` - Search and filter menu items
- `GET /api/v1/categories/:scraper` - Get available categories

### Example Usage

#### Get Il Caminetto Menu
```bash
curl http://localhost:3000/api/v1/scrapers/ilcaminetto/menu
```

#### Search for Vegetarian Pizza
```bash
curl "http://localhost:3000/api/v1/search?query=pizza&dietary=vegetarian&scraper=ilcaminetto"
```

#### Run Uber Scraper
```bash
curl -X POST http://localhost:3000/api/v1/scrapers/uber/scrape
```

## 🎨 Web User Interface

### Dashboard Features
- **🔍 Health Monitoring**: Real-time server status and uptime
- **📚 Scraper Overview**: List all available scrapers and their capabilities  
- **🍽️ Menu Browser**: View menu data with pagination and filtering
- **🔍 Advanced Search**: Search across all menu items with multiple filters
- **⚡ Scraper Controls**: Execute scrapers directly from the browser
- **📋 JSON Display**: Pretty-printed JSON responses with click-to-copy

### UI Sections

#### 1. System Health
- Monitor API server status
- View uptime and connectivity
- Auto-refresh every 30 seconds

#### 2. Scrapers Overview
- List all available scrapers
- View scraper endpoints and capabilities
- Access scraper documentation

#### 3. Menu Data Browser
- Browse complete menu datasets
- Switch between different scrapers
- View categories and item counts
- Access last updated timestamps

#### 4. Search & Filter
- **Text Search**: Search by item name or description
- **Scraper Filter**: Choose specific scraper data
- **Category Filter**: Filter by menu categories
- **Price Filter**: Set maximum price limits  
- **Dietary Filter**: Filter by dietary requirements
- **Real-time Results**: Instant search as you type

#### 5. Scraper Execution
- Run scrapers directly from the browser
- Monitor progress with loading indicators
- View execution results and logs
- Handle long-running operations gracefully

### Keyboard Shortcuts
- `Ctrl/Cmd + Enter`: Execute search from any input field
- Click any JSON display to copy to clipboard

## 🔧 Development

### Development Mode (Auto-restart)
```bash
npm run dev
```

### Available Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with auto-restart
- `npm run scrape:ilcaminetto` - Run Il Caminetto scraper
- `npm run scrape:uber` - Run Uber Eats scraper

## 📊 Data Schema

Each menu item follows this structure:
```json
{
  "_id": { "$oid": "unique_id" },
  "name": "Item Name",
  "price": "$17.00",
  "image": "http://example.com/image.jpg",
  "tags": ["pizza", "main"],
  "category": "PIZZE",
  "restaurant": "Restaurant Name",
  "dietary": ["vegetarian", "vegan"],
  "brandId": { "$oid": "brand_id" },
  "description": "Item description"
}
```

## 🔍 Search & Filter Options

- **Text Search**: Search by item name or description
- **Category Filter**: Filter by menu category
- **Price Filter**: Filter by maximum price
- **Dietary Filter**: Filter by dietary requirements (vegan, vegetarian, etc.)
- **Scraper Selection**: Choose which scraper to search

## 🛡️ Security Features

- **Helmet.js**: Security headers and protection
- **CORS**: Cross-origin resource sharing configuration
- **Input Validation**: Query parameter sanitization
- **Error Handling**: Comprehensive error responses

## 📈 Performance

- **Efficient Data Storage**: JSON files for fast access
- **Caching**: File-based caching with timestamps
- **Async Operations**: Non-blocking scraper execution
- **Resource Management**: Proper browser cleanup

## 🌐 Supported Platforms

### Il Caminetto Italian Restaurant
- **URL**: http://orders.ilcaminetto.com.au/
- **Features**: Full menu, dietary tags, real images
- **Categories**: Appetizers, Pasta, Pizza, Main Courses, Desserts

### Uber Eats
- **URL**: Configurable restaurant URLs
- **Features**: Menu items, pricing, dietary information
- **Categories**: Dynamic based on restaurant

## 📝 API Documentation

For complete API documentation, see [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🆘 Support

For issues or questions:
1. Check the server logs for detailed error information
2. Verify that the target websites are accessible
3. Ensure all dependencies are properly installed
4. Check that the scrapers have generated the required JSON files

## 🔮 Future Enhancements

- [ ] Database integration (MongoDB/PostgreSQL)
- [ ] Authentication and rate limiting
- [ ] Real-time scraping with WebSockets
- [ ] Additional scraper platforms
- [ ] Data analytics and insights
- [ ] Mobile app support
- [ ] Automated scheduling
- [ ] Data export formats (CSV, XML)

---

**Built with ❤️ using Node.js, Express.js, and Puppeteer**

# uber-scrapper
# uber-scrapper
# uber-scrapper
# uber-scrapper
