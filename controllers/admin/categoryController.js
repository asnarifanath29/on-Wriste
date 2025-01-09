const User = require("../../models/userSchema")
const mongoose = require("mongoose")
const Category = require("../../models/categorySchema");
const bcrypt = require("bcrypt")
const categoriesget = async (req, res) => {
    try {

        const categories = await Category.find(); // Assuming you're using Mongoose to fetch data
        // console.log('Fetched categories:', categories);  // Log the categories
        res.render('category', { categories });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ message: 'Error fetching categories' });
    }
};


// const categories = async (req, res) => {
//     const { name } = req.body;
    
//     try {
//         // Normalize the input to lowercase for comparison
//         const normalizedName = name.toLowerCase();

//         // Check if the category already exists (case-insensitive)
//         const existingCategory = await Category.findOne({ name: { $regex: `^${normalizedName}$`, $options: 'i' } });
//         if (existingCategory) {
//             return res.status(409).json({ error: 'Category already exists' });
//         }

//         // Create a new category if it doesn't exist
//         const category = new Category({ name: normalizedName }); // Store the normalized name
//         const savedCategory = await category.save();
//         res.status(201).json(savedCategory);
//     } catch (error) {
//         res.status(400).json({ error: 'Failed to add category' });
//     }
// };





// const categoriesedit = async (req, res) => {
//     const { id } = req.params;
//     const { name } = req.body;
//     try {
//         const updatedCategory = await Category.findByIdAndUpdate(id, { name }, { new: true });
//         res.status(200).json(updatedCategory);
//     } catch (error) {
//         res.status(400).json({ error: 'Failed to update category' });
//     }
// };



const categories = async (req, res) => {
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);

    const { categoryName, categoryDescription } = req.body; 
    
    console.log(req.body);
    
    if (!categoryName) {
        console.log('Category name missing');
        return res.status(400).json({ error: 'Category name is required' });
    }
    
    try {
        const normalizedName = categoryName.toLowerCase();
        
        const existingCategory = await Category.findOne({ 
            name: { $regex: `^${normalizedName}$`, $options: 'i' } 
        });
        
        if (existingCategory) {
            return res.status(409).json({ error: 'Category already exists' });
        }
        
        const category = new Category({
            name: normalizedName,
            description: categoryDescription,
        });
        
        const savedCategory = await category.save();
        res.status(201).json(savedCategory);
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: 'Failed to add category' });
    }
};




const categoriesedit = async (req, res) => {
    
    const { id, name, description } = req.body; // Get fields from the request body
    console.log('Request body:', req.body);  // Log the entire request body
    console.log('ID received:', req.body.id); // Log the received ID
    console.log('Name received:', req.body.name);

    // Trim any spaces from the category name
    const normalizedName = name.trim().toLowerCase();

    try {
        // Check for duplicate category name (excluding the current category being edited)
        const existingCategory = await Category.findOne({
            name: { $regex: `^${normalizedName}$`, $options: 'i' },
            _id: { $ne: id }, // Exclude the current category
        });

        if (existingCategory) {
            return res.status(409).json({ error: 'Category with this name already exists' });
        }

        const updatedCategory = await Category.findByIdAndUpdate(
            id,
            { name: normalizedName, description: description },
            { new: true }
        );

        if (!updatedCategory) {
            return res.status(404).json({ error: 'Category not found' });
        }

        return res.status(200).json(updatedCategory);

    } catch (error) {
        console.error('Error updating category:', error); // Log the error for debugging
        return res.status(400).json({ error: 'Failed to update category' });
    }
};


const categorieslist = async (req, res) => {
    const { id } = req.params;
    try {
        const updatedCategory = await Category.findByIdAndUpdate(id, { status: 'listed' }, { new: true });
        res.status(200).json(updatedCategory);
    } catch (error) {
        res.status(400).json({ error: 'Failed to list category' });
    }
};
const categoriesunlist = async (req, res) => {
    const { id } = req.params;
    try {
        const updatedCategory = await Category.findByIdAndUpdate(id, { status: 'unlisted' }, { new: true });
        res.status(200).json(updatedCategory);
    } catch (error) {
        res.status(400).json({ error: 'Failed to unlist category' });
    }
};

const getAddPage=async (req, res) => {
    try {
        res.render('add-category');
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ message: 'Error fetching categories' });
    }
};

// const getEditPage=async (req, res) => {
//     const productId = req.params.id;
//     try {
//         // Fetch product and categories from the database
//         // const product = await Product.findById(productId).populate('category');
//         const categories = await Category.find();

//         // Render the edit page with product and categories
//         res.render('edit-category', {  categories });
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Error loading product details');
//     }
// };
const getEditPage = async (req, res) => {
    const categoryId = req.params.id; // Assuming categoryId is sent as a URL parameter
    try {
        // Fetch the category to be edited
        const category = await Category.findById(categoryId);

        // Fetch all categories (if required for other parts of the page)
        const categories = await Category.find();

        if (!category) {
            return res.status(404).send('Category not found');
        }

        // Render the edit page with category and categories
        res.render('edit-category', { category, categories });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error loading category details');
    }
};


module.exports = { categories, categoriesget, categoriesedit, categorieslist, categoriesunlist, getAddPage ,getEditPage}