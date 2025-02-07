const { name } = require("ejs")
const mongoose = require('mongoose');
const User = require("../../models/userSchema")
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const Wishlist = require("../../models/wishlistSchema");


const loadwishlist = async (req, res) => {
    const userId = req.session.userData.id;
   

    try {
        const wishlist = await Wishlist.findOne({ userId })
    .populate({
        path: 'products.productId',
        populate: { path: 'category' } 
    });

        const cart=await Cart.findOne({userId})

        // Provide a default structure if wishlist is null
        const wishlistData = wishlist || { _id: null, userId, products: [] };

        // Render the wishlist page with userData and wishlist data
        res.render("wishlist", { userData: req.session.userData, wishlist: wishlistData ,cart});
    } catch (error) {
        console.error("Error loading wishlist:", error);
        res.status(500).json({
            message: "An unexpected error occurred. Please try again later.",
        });
    }
};




const addToWishlist = async (req, res) => {
    try {

       
        const userId = req.session?.userData?.id;
        
        if (!userId) {
            return res.status(401).json({ success: false, notLoggedIn: true, message: 'Please log in to add items to the cart.' });
        }

        const { productId } = req.body;


        if (!productId) {
            return res.status(400).json({ success: false, message: 'Product ID is required.' });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found.' });
        }
        // Check if product is already in cart
        // const cart = await Cart.findOne({ userId });
        // const productInCart = cart?.items.some(item => item.productId.toString() === productId);
        
        // if (productInCart) {
        //     return res.status(200).json({ 
        //         success: false, 
        //         message: 'Product is already in your cart. Cannot add to wishlist.' 
        //     });
        // }

        
        let wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            wishlist = new Wishlist({ userId, products: [] });
        }

        const productExists = wishlist.products.some(item => item.productId.toString() === productId);

        if (productExists) {
            return res.status(200).json({ success: false, message: 'Product is already in your wishlist.' });
        }


        wishlist.products.push({ productId });
        await wishlist.save();

        res.status(200).json({ success: true, message: 'Product added to your wishlist.' });
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        res.status(500).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
    }
};

const deletewishlist = async (req, res) => {
    try {
        const userId = req.session.userData.id;
        const productId = req.params.productId;

      
        if (!productId) {
            return res.status(400).json({
                success: false,
                message: 'Product ID is required.'
            });
        }

        const wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            return res.status(404).json({
                success: false,
                message: 'Wishlist not found.'
            });
        }

        const initialLength = wishlist.products.length;
        wishlist.products = wishlist.products.filter(
            item => item.productId.toString() !== productId
        );

        if (wishlist.products.length === initialLength) {
            return res.status(404).json({
                success: false,
                message: 'Product not found in wishlist.'
            });
        }

        await wishlist.save();

        res.status(200).json({
            success: true,
            message: 'Product successfully removed from wishlist'
        });

    } catch (error) {
        console.error('Error removing product from wishlist:', error);
        res.status(500).json({
            success: false,
            message: 'An unexpected error occurred. Please try again later.'
        });
    }
};

module.exports = { loadwishlist, addToWishlist, deletewishlist }