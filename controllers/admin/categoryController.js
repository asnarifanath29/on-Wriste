const User = require("../../models/userSchema")
const mongoose = require("mongoose")
const Category = require("../../models/categorySchema");
const bcrypt = require("bcrypt")
const categoriesget = async (req, res) => {
    try {
        const categories = await Category.find(); 
        res.render('category', { categories });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ message: 'Error fetching categories' });
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

const categories = async (req, res) => {
    const { categoryName, categoryDescription } = req.body; 
    
    
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
const getEditPage = async (req, res) => {
    const categoryId = req.params.id; 
    try {
        const category = await Category.findById(categoryId);
        const categories = await Category.find();
        if (!category) {
            return res.status(404).send('Category not found');
        }
        res.render('edit-category', { category, categories });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error loading category details');
    }
};



const categoriesedit = async (req, res) => {
    
    const { id, name, description } = req.body; 
   
    const normalizedName = name.trim().toLowerCase();

    try {

        const existingCategory = await Category.findOne({
            name: { $regex: `^${normalizedName}$`, $options: 'i' },
            _id: { $ne: id }, 
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
        console.error('Error updating category:', error); 
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






module.exports = { categories, categoriesget, categoriesedit, categorieslist, categoriesunlist, getAddPage ,getEditPage}