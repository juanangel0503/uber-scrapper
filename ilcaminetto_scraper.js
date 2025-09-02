import puppeteer from 'puppeteer';
import fs from 'fs';

async function ilcaminettoScraper(targetUrl = null) {
  const TARGET_URL = targetUrl || process.argv[2] || 'https://orders.ilcaminetto.com.au/';
  
  console.log("🚀 Starting Il Caminetto Italian Restaurant scraper...");
  console.log(`📍 Target URL: ${TARGET_URL}`);
  
  let browser;
  
  try {
    browser = await puppeteer.launch({ 
      headless: true,
      executablePath: "/usr/bin/chromium-browser",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu"
      ]
    });
    const page = await browser.newPage();
    
    console.log("🍕 Navigating to Il Caminetto...");
    await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    console.log("📸 Taking screenshot for debugging...");
    await page.screenshot({ path: 'ilcaminetto_debug.png', fullPage: true });
    
    const html = await page.content();
    fs.writeFileSync('ilcaminetto_debug.html', html);
    console.log(`📄 Page HTML length: ${html.length}`);
    
    console.log("🏪 Extracting restaurant information...");
    const restaurantData = await page.evaluate(() => {
      function text(el) { return el ? el.textContent.trim() : null; }
      
      const data = { name: null, address: null, phone: null, hours: null };
      
      data.name = text(document.querySelector('h1')) || 'Il Caminetto Italian Restaurant';
      
      const addressEl = document.querySelector('a[href*="maps.google.com"]');
      if (addressEl) data.address = addressEl.textContent.trim();
      
      const phoneEl = document.querySelector('a[href^="tel:"]');
      if (phoneEl) data.phone = phoneEl.textContent.trim();
      
      return data;
    });
    
    console.log("🏪 Restaurant:", restaurantData.name);
    console.log("📍 Address:", restaurantData.address);
    console.log("📞 Phone:", restaurantData.phone);
    
    console.log("🔍 Extracting menu data...");
    const menuData = await page.evaluate(() => {
      const categories = [];
      
      // Find all category sections by looking for category names
      const categoryElements = document.querySelectorAll('[id^="TabSelectOption-"]');
      
      categoryElements.forEach(categoryEl => {
        const categoryName = categoryEl.textContent.trim();
        
        if (!categoryName || 
            categoryName.includes('Services') || 
            categoryName.includes('Opening Hours') || 
            categoryName.includes('Location') || 
            categoryName.includes('Phone')) {
          return;
        }
        
        const category = { category: categoryName, items: [] };
        
        // Find the corresponding dish grid section
        const dishGridId = categoryEl.id;
        const dishGridSection = document.getElementById(dishGridId.replace('TabSelectOption-', ''));
        
        if (dishGridSection) {
          // Find all dish items in this section
          const dishItems = dishGridSection.querySelectorAll('.item__DishComponent-wkeq8p-0');
          
          dishItems.forEach(dishItem => {
            const itemName = dishItem.querySelector('h2')?.textContent.trim();
            
            if (!itemName || 
                itemName.includes('Liquor licence') || 
                itemName.includes('Guest') ||
                itemName.includes('Login')) {
              return;
            }
            
            const item = {
              name: itemName,
              description: null,
              price: null,
              image: null,
              dietary: [],
              options: []
            };
            
            // Get description
            const descEl = dishItem.querySelector('p');
            if (descEl) {
              item.description = descEl.textContent.trim();
            }
            
            // Get price
            const priceEl = dishItem.querySelector('.item__Price-wkeq8p-6 p');
            if (priceEl) {
              item.price = priceEl.textContent.trim();
            }
            
            // Get image from data-bg attribute (real restaurant images)
            const imageEl = dishItem.querySelector('.item__Image-wkeq8p-1');
            if (imageEl) {
              // First try to get from data-bg attribute (real images)
              const dataBg = imageEl.getAttribute('data-bg');
              if (dataBg) {
                item.image = dataBg;
              } else if (imageEl.style.backgroundImage) {
                // Fallback to style background
                const bgImage = imageEl.style.backgroundImage;
                const urlMatch = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
                if (urlMatch) {
                  item.image = urlMatch[1];
                }
              }
            }
            
            // Get dietary tags
            const dietaryTags = dishItem.querySelectorAll('.dishtag__Text-htARsz');
            dietaryTags.forEach(tag => {
              const tagText = tag.textContent.trim();
              if (tagText === 'V') item.dietary.push('vegetarian');
              if (tagText === 'VGO') item.dietary.push('vegan');
              if (tagText === 'GFO') item.dietary.push('gluten free option');
            });
            
            category.items.push(item);
          });
        }
        
        if (category.items.length > 0) {
          categories.push(category);
        }
      });
      
      return categories;
    });
    
    console.log(`📊 Found ${menuData.length} categories with ${menuData.reduce((sum, cat) => sum + cat.items.length, 0)} total items`);
    
    console.log("🔄 Transforming data to new schema...");
    const transformedData = transformToNewSchema(restaurantData, menuData);
    
    const filename = "ilcaminetto_menu.json";
    fs.writeFileSync(filename, JSON.stringify(transformedData, null, 2));
    console.log(`\n✅ Success! Saved ${filename}`);
    
    menuData.forEach(cat => {
      console.log(`  • ${cat.category}: ${cat.items.length} items`);
    });
    
    if (transformedData.length > 0) {
      console.log("\n📋 Sample transformed item:");
      console.log(JSON.stringify(transformedData[0], null, 2));
    }

    return {
      success: true,
      filename,
      totalItems: transformedData.length,
      categories: menuData.map(cat => ({ name: cat.category, itemCount: cat.items.length })),
      sampleItem: transformedData[0]
    };
    
  } catch (error) {
    console.error("❌ Error during scraping:", error.message);
    throw error;
  } finally {
    if (browser) {
      console.log("🔒 Closing browser...");
      await browser.close();
    }
  }
}

function transformToNewSchema(restaurantData, menuData) {
  const transformedItems = [];
  
  menuData.forEach(category => {
    category.items.forEach(item => {
      const uniqueId = generateObjectId();
      
      let priceString = "$0.00";
      if (item.price) {
        const priceMatch = item.price.match(/\$([\d.]+)/);
        if (priceMatch) {
          priceString = `$${priceMatch[1]}`;
        }
      }
      
      const tags = generateTags(item.name, item.description);
      const dietary = item.dietary || [];
      const brandId = generateObjectId();
      // Use extracted image if available, otherwise fallback to appropriate image
      const image = item.image || getItalianRestaurantImage(item.name, category.category);
      
      transformedItems.push({
        "_id": { "$oid": uniqueId },
        "name": item.name,
        "price": priceString,
        "image": image,
        "tags": tags,
        "category": category.category.toUpperCase(),




        
        "restaurant": restaurantData.name,
        "dietary": dietary,
        "brandId": { "$oid": brandId },
        "description": item.description || ""
      });
    });
  });
  
  return transformedItems;
}

function generateObjectId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function generateTags(name, description) {
  const tags = [];
  const text = `${name} ${description || ''}`.toLowerCase();
  
  if (text.includes('pasta') || text.includes('tortelloni') || text.includes('gnocchi') || text.includes('tagliatelle')) {
    tags.push('pasta');
  }
  
  if (text.includes('pizza') || text.includes('margherita') || text.includes('capricciosa') || text.includes('calzone')) {
    tags.push('pizza');
  }
  
  if (text.includes('risotto')) {
    tags.push('risotto');
  }
  
  if (text.includes('antipasti') || text.includes('stuzzichini')) {
    tags.push('appetizer');
  }
  
  if (text.includes('main') || text.includes('secondi')) {
    tags.push('main course');
  }
  
  if (text.includes('dessert') || text.includes('tiramisu') || text.includes('cannolo')) {
    tags.push('dessert');
  }
  
  if (text.includes('kids')) {
    tags.push('kids menu');
  }
  
  return tags;
}



function getItalianRestaurantImage(itemName, category) {
  const name = itemName.toLowerCase();
  
  if (name.includes('pizza') || name.includes('margherita') || name.includes('capricciosa')) {
    return "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop";
  }
  
  if (name.includes('pasta') || name.includes('tortelloni') || name.includes('gnocchi')) {
    return "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=400&h=300&fit=crop";
  }
  
  if (name.includes('risotto')) {
    return "https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=400&h=300&fit=crop";
  }
  
  return "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop";
}

// Export for API usage
export { ilcaminettoScraper };

// CLI usage (when run directly)
if (import.meta.url === `file://${process.argv[1]}`) {
  ilcaminettoScraper().catch(err => {
    console.error("\n=== ERROR SUMMARY ===");
    console.error("Error:", err.message);
    console.error("\nPossible solutions:");
    console.error("1. Check if the Il Caminetto URL is accessible");
    console.error("2. Verify your internet connection");
    console.error("3. The page structure might have changed - check selectors");
    console.error("4. Try running with headless: false to see what's happening");
    process.exit(1);
  });
}
