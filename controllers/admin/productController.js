
const Product = require("../../models/productSchema");
const Category = require('../../models/categorySchema')
const mongoose = require("mongoose");
const path = require('path');
const fs = require('fs')



const getProduct = async (req, res) => {
    try {
        const products = await Product.find().populate('category') 
        const categories = await Category.find()
        res.render('products', { products, categories }); 
    } catch (error) {
        res.status(500).send({ error: 'Failed to fetch products.' });
    }
};
const getAddPage = async (req, res) => {
    try {
        const categories = await Category.find();
        res.render('add-product', { categories });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Failed to load the add-product page.' });
    }
};


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

        const categories = await Category.find({});

       
        const products = await Product.find().populate('category') 

        // res.render('products', { products, categories });
        res.redirect('/admin/products')
    } catch (error) {
        res.status(400).json({

            success: false,
            error: error.message
        });
    }
};

const getEditPage = async (req, res) => {
    const productId = req.params.id;
    try {
       
        const product = await Product.findById(productId).populate('category');
        const categories = await Category.find();

        res.render('edit-product', { product, categories });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error loading product details');
    }
};

const editProduct = async (req, res) => {
    try {
        const { id, name, description, price, salesPrice, category, stock, brand } = req.body;
        const updateData = { name, price, salesPrice, category, stock, brand };

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }


        product.name = name;
        product.description = description;
        product.price = price;
        product.salesPrice = salesPrice;
        product.brand = brand;
        product.category = category;
        product.updatedAt = Date.now();
        product.stock = stock;

     
        const imageFields = ['productImage1', 'productImage2', 'productImage3', 'productImage4'];
        if (req.files) {  
            imageFields.forEach((field, index) => {
                const files = req.files[field];
                
                
                if (files && files[0]) { 
                   
                    if (product.images[index]) {
                        const oldImagePath = path.join(__dirname, '../../public', product.images[index]);
                        
                        if (fs.existsSync(oldImagePath)) {
                            fs.unlinkSync(oldImagePath);
                        }
                    }
                   
                    product.images[index] = `/productUploads/${files[0].filename}`;
                }
            });
        }
        
        await product.save();
        const products = await Product.find().populate('category');
        const categories = await Category.find();
        res.render('products', { products, categories });
    } catch (error) {
        console.error('Error editing product:', error);
        res.status(500).send({ error: 'Failed to edit product.' });
    }
};


const toggleFeatured = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        product.isDeleted = !product.isDeleted;

        await product.save();

        res.json({ success: true, isDeleted: product.isDeleted });
    } catch (error) {
        console.error('Error toggling product status:', error);
        res.status(500).json({ success: false, message: 'Failed to toggle product status' });
    }
};


module.exports = { addProduct, getProduct, editProduct, toggleFeatured, getAddPage, getEditPage };