const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');

const filter = async (req, res) => {
    try {
        const { sortBy, priceRange, excludeOutOfStock, category } = req.body;

         // First, get all listed categories
         const listedCategories = await Category.find({ status: 'listed' });
         const listedCategoryIds = listedCategories.map(cat => cat._id);
 
         let query = {
             isDeleted: false,
             // Only include products from listed categories
             category: { $in: listedCategoryIds }
         };
        let sort = {};
        

        // 1. **Price Range Filter**
        if (priceRange) {
            switch (priceRange) {
                case '$0.00 - $999.00':
                    query.price = { $gte: 0, $lte: 999 };
                    break;
                case '$1000.00 - $2999.00':
                    query.price = { $gte: 1000, $lte: 2999 };
                    break;
                case '$3000.00 - $6999.00':
                    query.price = { $gte: 3000, $lte: 6999 };
                    break;
                case '$7000.00 - $9999.00':
                    query.price = { $gte: 7000, $lte: 9999 };
                    break;
                case '$10000.00+':
                    query.price = { $gte: 10000 };
                    break;
            }
        }

        // 2. **Availability Filter**
        if (excludeOutOfStock) {
            query.stockManagement = { $elemMatch: { quantity: { $gt: 0 } } };
        }

        // 3. **Category Filter**

        if (category && category !== "*") {
            const foundCategory = await Category.findOne({ name: category });

            if (!foundCategory) {
                return res.status(400).json({ error: 'Category not found' });
            }

            // Add the category ObjectId to the query
            query.category = foundCategory._id;
        }

        // 4. **Sort By Filter**
        if (sortBy) {
            switch (sortBy) {
                case 'Price: Low to High':
                    sort.price = 1;
                    break;
                case 'Price: High to Low':
                    sort.price = -1;
                    break;
                case 'aA - zZ':
                    sort.name = 1;
                    break;
                case 'zZ - aA':
                    sort.name = -1;
                    break;
                case 'Newness':
                    sort.createdAt = -1;
                    break;
                default:
                    sort = {};
            }
        }

        query.isDeleted = false;

        const products = await Product.find(query).sort(sort).populate('category');

        res.json({ products: products }); 
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'An error occurred while fetching products.' });
    }
};



const search = async (req, res) => {
    try {
        const searchTerm = req.body.search;
        const excludeOutOfStock = req.body.excludeOutOfStock;
        
           // Get listed categories
           const listedCategories = await Category.find({ status: 'listed' });
           const listedCategoryIds = listedCategories.map(cat => cat._id);
        let query = {
            name: { $regex: searchTerm, $options: "i" },
            isDeleted: false,
             // Only include products from listed categories
             category: { $in: listedCategoryIds }
        };

        if (excludeOutOfStock) {
            query['stockManagement'] = {
                $elemMatch: {
                    quantity: { $gt: 0 }
                }
            };
        }

        const products = await Product.find(query);

        
        res.json({ products });
    } catch (error) {
        console.error("Search error:", error);
        res.status(500).json({ error: "Server error" });
    }
};






module.exports = {
    filter,
    search
}