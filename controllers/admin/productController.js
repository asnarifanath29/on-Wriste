// const Product = require('../../models/productSchema'); // Adjust the path as necessary

// const productController = {
//     // Add a new product
//     addProduct: async (req, res) => {
//         try {
//             const { name, description, price, category } = req.body;

//             // Check if all fields are provided
//             if (!name || !description || !price || !category) {
//                 return res.status(400).json({ message: 'All fields are required.' });
//             }

//             // Check if at least 3 images are uploaded
//             if (!req.files || req.files.length < 3) {
//                 return res.status(400).json({ message: 'Please upload at least 3 images.' });
//             }

//             const images = req.files.map((file) => file.path);
//             const productData = { name, description, price, category, images };

//             const newProduct = await Product.create(productData);
//             res.status(201).json({ success: true, product: newProduct });
//         } catch (error) {
//             console.error(error);
//             res.status(500).json({ success: false, message: 'Error adding product.', error: error.message });
//         }
//     },

//     // Fetch all products (supports listed/unlisted toggle)
//     getProducts: async (req, res) => {
//         try {
//             const { status } = req.query; // e.g., ?status=listed or ?status=unlisted
//             const filter = status === 'unlisted' ? { isDeleted: true } : { isDeleted: false };

//             const products = await Product.find(filter);
//             res.status(200).json({ success: true, products });
//         } catch (error) {
//             console.error(error);
//             res.status(500).json({ success: false, message: 'Error fetching products.', error: error.message });
//         }
//     },

//     // Edit a product
//     editProduct: async (req, res) => {
//         try {
//             const { id } = req.params;
//             const { name, description, price, category } = req.body;

//             const updates = { name, description, price, category };

//             // Check if new images are uploaded, and update images if present
//             if (req.files && req.files.length >= 3) {
//                 updates.images = req.files.map((file) => file.path);
//             }

//             const updatedProduct = await Product.findByIdAndUpdate(id, updates, { new: true });
//             if (!updatedProduct) {
//                 return res.status(404).json({ success: false, message: 'Product not found.' });
//             }

//             res.status(200).json({ success: true, product: updatedProduct });
//         } catch (error) {
//             console.error(error);
//             res.status(500).json({ success: false, message: 'Error editing product.', error: error.message });
//         }
//     },

//     // Soft delete or restore a product
//     toggleProductStatus: async (req, res) => {
//         try {
//             const { id } = req.params;
//             const { action } = req.query; // e.g., ?action=unlist or ?action=list

//             // Validate the action parameter
//             if (!['list', 'unlist'].includes(action)) {
//                 return res.status(400).json({ success: false, message: 'Invalid action. Use "list" or "unlist".' });
//             }

//             const product = await Product.findById(id);
//             if (!product) {
//                 return res.status(404).json({ success: false, message: 'Product not found.' });
//             }

//             // Update the product's status
//             product.isDeleted = action === 'unlist';
//             await product.save();

//             const status = action === 'unlist' ? 'unlisted' : 'listed';
//             res.status(200).json({ success: true, message: `Product successfully ${status}.`, product });
//         } catch (error) {
//             console.error(error);
//             res.status(500).json({ success: false, message: 'Error toggling product status.', error: error.message });
//         }
//     },
// };

// module.exports = productController;

const Product = require("../../models/productSchema");
const Category = require('../../models/categorySchema')
const mongoose = require("mongoose");
const path = require('path');
const fs = require('fs')

const addProduct = async (req, res) => {
    try {
        const { name, description, price, salesPrice, brand, stock, warranty, returnPolicy, category } = req.body;

        const imagePaths = [];
        for (const key in req.files) {
            req.files[key].forEach((file) => {
                const relativePath = file.path.split('public')[1];
                imagePaths.push(relativePath);
            });
        }
        const product = new Product({
            name,
            description,
            price,
            salesPrice,
            images: imagePaths,
            brand,
            stock,
            warranty,
            returnPolicy,
            category,
            isDeleted: false,
            createdAt: Date.now(),
            updatedAt: Date.now()
        });

        await product.save();
        // Fetch all categories to pass to the view
        const categories = await Category.find({});

        // res.status(200).json({
        //     success: true,
        //     data: product
        // });
        // Render the `product.ejs` with the product data
        // res.redirect(200,'/admin/products');
        // res.status(200).render('product', { product, categories });
        const products = await Product.find().populate('category')  // Fetch the products from the database

        res.render('products', { products, categories });

    } catch (error) {
        res.status(400).json({

            success: false,
            error: error.message
        });
    }
};



const getProduct = async (req, res) => {
    try {
        const products = await Product.find().populate('category')  // Fetch the products from the database
        const categories = await Category.find()
        res.render('products', { products, categories });  // Render the 'product.ejs' view and pass the products data
    } catch (error) {
        res.status(500).send({ error: 'Failed to fetch products.' });
    }
};


// Edit a product
const editProduct = async (req, res) => {
    try {
        const { id, name, description, price, salesPrice, category, stock, brand } = req.body;
        const updateData = { name, price, salesPrice, category, stock, brand };

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Update basic product info
        product.name = name;
        product.description = description;
        product.price = price;
        product.salesPrice = salesPrice;
        product.brand = brand;
        product.category = category;
        product.updatedAt = Date.now();
        product.stock = stock;

        // Handle image updates
        const imageFields = ['productImage1', 'productImage2', 'productImage3', 'productImage4'];
        if (req.files) {  // Check if there are any uploaded files
            imageFields.forEach((field, index) => {
                const files = req.files[field];
                console.log('files : ');
                console.log(files);
                
                if (files && files[0]) {  // Check if there's a file for this field
                    // Delete old image if it exists
                    if (product.images[index]) {
                        const oldImagePath = path.join(__dirname, '../../public', product.images[index]);
                        console.log(oldImagePath);
                        
                        if (fs.existsSync(oldImagePath)) {
                            fs.unlinkSync(oldImagePath);
                        }
                    }
                    // Save new image URL
                    product.images[index] = `/productUploads/${files[0].filename}`;
                }
            });
        }
        
        await product.save();
        
        
        // Fetch updated data for rendering
        const products = await Product.find().populate('category');
        const categories = await Category.find();
        res.render('products', { products, categories });
    } catch (error) {
        console.error('Error editing product:', error);
        res.status(500).send({ error: 'Failed to edit product.' });
    }
};

// Toggle "featured" status
const toggleFeatured = async (req, res) => {
    try {
        const productId = req.params.id;

        // Find the product by ID
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Toggle the `isDeleted` status
        product.isDeleted = !product.isDeleted;

        // Save the updated product
        await product.save();

        res.json({ success: true, isDeleted: product.isDeleted });
    } catch (error) {
        console.error('Error toggling product status:', error);
        res.status(500).json({ success: false, message: 'Failed to toggle product status' });
    }
};

const getAddPage = async (req, res) => {
    try {
        const categories = await Category.find(); // Fetch categories
        res.render('add-product', { categories });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Failed to load the add-product page.' });
    }
};


const getEditPage = async (req, res) => {
    const productId = req.params.id;
    try {
        // Fetch product and categories from the database
        const product = await Product.findById(productId).populate('category');
        const categories = await Category.find();

        // Render the edit page with product and categories
        res.render('edit-product', { product, categories });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error loading product details');
    }
};


module.exports = { addProduct, getProduct, editProduct, toggleFeatured, getAddPage, getEditPage };