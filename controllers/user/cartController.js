const User = require("../../models/userSchema")
const Cart = require("../../models/cartSchema")
const Product = require("../../models/productSchema")
const Address = require("../../models/addressSchema")
const Order = require("../../models/orderSchema")
const Category = require('../../models/categorySchema');

const loadCartpage = async (req, res) => {
    try {
        const userId = req.session.userData.id;
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        req.session.cart = cart._id;

        if (!cart || !cart.items || !Array.isArray(cart.items)) {
            return res.render('cart', {
                userData: req.session.userData,
                cart: [],
                subtotal: 0,
            });
        }

        let subtotal = 0;
        cart.items.forEach(item => {
            subtotal += item.productId.salesPrice * item.quantity;
        });

        res.render('cart', {
            userData: req.session.userData,
            cart: cart,
            subtotal: subtotal,
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching cart data');
    }
};

const addtocart = async (req, res) => {
    try {
        const productId = req.body.productId;
        const userId = req.session.userData.id;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        // Validate if the product exists and get its stock
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Find the user's cart or create a new one
        let cart = await Cart.findOne({ userId });

        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }

        if (!cart.items) {
            cart.items = [];
        }

        // Check if the product already exists in the cart
        const existingItemIndex = cart.items.findIndex(
            item => item.productId.toString() === productId
        );

        let newQuantity;
        if (existingItemIndex !== -1) {
            newQuantity = cart.items[existingItemIndex].quantity + 1;
        } else {
            newQuantity = 1;
        }

        // Check if the new quantity exceeds stock
        if (newQuantity > product.stock) {
            return res.status(400).json({
                success: false,
                message: 'Stock limit reached',
                availableStock: product.stock
            });
        }

        // Update or add the item
        if (existingItemIndex !== -1) {
            cart.items[existingItemIndex].quantity = newQuantity;
        } else {
            cart.items.push({ productId, quantity: newQuantity });
        }

        await cart.save();

        // Decrease the product stock
        // product.stock -= 1; // Decrease stock by 1 for each addition to the cart
        // await product.save();
        return res.status(200).json({ success: true, message: 'Product added to cart', cart });

    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// const updatecart = async (req, res) => {
//     try {
//         const { productId, quantity } = req.body;
//         const userId = req.session.userData.id;

//         // Basic validation
//         if (!productId || quantity < 1) {
//             return res.status(400).json({ error: 'Invalid input' });
//         }

//         // Find product and check stock
//         const product = await Product.findById(productId);
//         if (!product || quantity > product.stock) {
//             return res.status(400).json({ error: 'Product unavailable or insufficient stock' });
//         }

//         // Update or create cart item
//         const cart = await Cart.findOneAndUpdate(
//             { userId },
//             {
//                 $set: {
//                     'items.$[elem].quantity': quantity
//                 }
//             },
//             {
//                 arrayFilters: [{ 'elem.productId': productId }],
//                 new: true,
//                 upsert: true
//             }
//         );

//         // If item doesn't exist in cart, add it
//         if (!cart.items.some(item => item.productId.toString() === productId)) {
//             cart.items.push({ productId, quantity });
//             await cart.save();
//         }

//         res.json({ success: true, cart });

//     } catch (error) {
//         console.error('Cart update error:', error);
//         res.status(500).json({ error: 'Update failed' });
//     }
// };


// const updatecart = async (req, res) => {
//     try {
//         const { productId } = req.body;
//         const userId = req.session.userData.id;

//         // Basic validation
//         if (!productId) {
//             return res.status(400).json({ error: 'Product ID is required' });
//         }

//         // Find product and check stock
//         const product = await Product.findById(productId);
//         if (!product) {
//             return res.status(400).json({ error: 'Product not found' });
//         }

//         // Find existing cart to check current quantity
//         const existingCart = await Cart.findOne({ userId });
//         const existingItem = existingCart?.items?.find(
//             item => item.productId.toString() === productId
//         );
//         const existingQuantity = existingItem ? existingItem.quantity : 0;
//         const newQuantity = existingQuantity + 1; // Increment by 1

//         // Check if new quantity exceeds stock
//         if (newQuantity > product.stock) {
//             return res.status(400).json({
//                 error: 'Insufficient stock',
//                 availableStock: product.stock,
//                 currentQuantity: existingQuantity
//             });
//         }

//         // Update or create cart item
//         const cart = await Cart.findOneAndUpdate(
//             { userId },
//             {
//                 $set: {
//                     'items.$[elem].quantity': newQuantity
//                 }
//             },
//             {
//                 arrayFilters: [{ 'elem.productId': productId }],
//                 new: true,
//                 upsert: true
//             }
//         );

//         // If item doesn't exist in cart, add it
//         if (!cart.items.some(item => item.productId.toString() === productId)) {
//             cart.items.push({ productId, quantity: 1 }); // Start with quantity 1 for new items
//             await cart.save();
//         }

//         res.json({
//             success: true,
//             cart,
//             updatedQuantity: newQuantity,
//             availableStock: product.stock
//         });

//     } catch (error) {
//         console.error('Cart update error:', error);
//         res.status(500).json({ error: 'Update failed' });
//     }
// };

const updatecart = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const userId = req.session.userData.id;

        // Basic validation
        if (!productId || quantity === undefined) {
            return res.status(400).json({ error: 'Product ID and quantity are required' });
        }

        // Validate quantity
        if (quantity < 1) {
            return res.status(400).json({ error: 'Quantity must be at least 1' });
        }

        // Find product and check stock
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Find existing cart and cart item
        let cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }

        const itemIndex = cart.items.findIndex(
            item => item.productId.toString() === productId
        );

        if (itemIndex === -1) {
            return res.status(404).json({ error: 'Product not found in cart' });
        }

        // Get the current quantity in the cart
        const currentQuantity = cart.items[itemIndex].quantity;

        // Check if the new quantity exceeds stock
        if (quantity > product.stock + currentQuantity) { // Allow for restocking when reducing quantity
            return res.status(400).json({
                error: 'Insufficient stock',
                availableStock: product.stock
            });
        }

        // Update product stock based on quantity change
        const stockDifference = quantity - currentQuantity; // Positive if increasing, negative if decreasing
        product.stock -= stockDifference; // Decrease or increase stock based on the difference

        // Update cart with new quantity
        cart.items[itemIndex].quantity = quantity;

        // Save updated product and cart
        // await product.save();
        await cart.save();

        res.json({
            success: true,
            cart,
            updatedQuantity: quantity,
            availableStock: product.stock,
        });

    } catch (error) {
        console.error('Error updating cart:', error);
        res.status(500).json({ error: 'Update failed' });
    }
};



const loadCheckoutpage = async (req, res) => {
    try {
        const subtotal = req.session.subtotal
        const userId = req.session.userData.id;
        const userAddress = await Address.find({ userId: userId });
        res.render("checkout", { userData: req.session.userData, addresses: userAddress, subtotal })
    } catch (error) {
        console.error('checkout page not loading:', error);
        res.status(500).json({ error: 'Update failed' });
    }
}

const Checkout = async (req, res) => {
    const { subtotal } = req.body;

    if (typeof subtotal === 'number' && subtotal >= 0) {
        console.log('Received subtotal:', subtotal);

        // Store the subtotal in the session or temporary storage
        req.session.subtotal = subtotal;

        // Respond with success
        return res.status(200).json({ message: 'Subtotal received' });
    }

    console.error('Invalid subtotal:', req.body);
    return res.status(400).json({ error: 'Invalid subtotal' });
};



// const placeOrder = async (req, res) => {
//     try {
//         const { selectedAddress, paymentMethod } = req.body;

//         const cartId = req.session.cart;

//         // Validate cart exists
//         const cart = await Cart.findById(cartId).populate('items.productId');
//         if (!cart || !cart.items.length) {
//             return res.status(400).json({
//                 message: "Your cart is empty"
//             });
//         }

//         // Validate address
//         if (!selectedAddress || !selectedAddress.name) {
//             return res.status(400).json({
//                 message: "Please select a valid delivery address"
//             });
//         }

//         // Validate payment method
//         if (!paymentMethod || !['cod', 'razorpay'].includes(paymentMethod)) {
//             return res.status(400).json({
//                 message: "Please select a valid payment method"
//             });
//         }

//         // Calculate order totals
//         let totalAmount = 0;
//         const orderItems = cart.items.map(item => {
//             const itemTotal = item.productId.price * item.quantity;
//             totalAmount += itemTotal;

//             return {
//                 productId: item.productId._id,
//                 quantity: item.quantity,
//                 price: item.productId.price,
//                 image: item.productId.images[0], // Assuming first image is main image
//                 isCanceled: false
//             };
//         });

//         const shippingFee = 10; // Your shipping fee logic here
//         const payableAmount = totalAmount + shippingFee;

//         // Generate unique order ID
//         const orderedId = 'ORD' + Date.now() + Math.floor(Math.random() * 1000);

//         // Create new order
//         const newOrder = new Order({
//             userId: req.session.userData.id,
//             orderedId: orderedId,
//             address: selectedAddress,
//             items: orderItems,
//             paymentStatus: paymentMethod === 'cod' ? 'Pending' : 'Pending',
//             paymentMethod: paymentMethod,
//             orderStatus: 'Pending',
//             totalAmount: totalAmount,
//             payableAmount: payableAmount,
//             shippingFee: shippingFee
//         });

//         await newOrder.save();

//         // Clear cart after successful order placement
//         await Cart.findByIdAndUpdate(cartId, { $set: { items: [] } });

//         res.status(200).json({
//             message: "Order placed successfully!",
//             orderId: newOrder._id
//         });

//     } catch (error) {
//         console.error("Error placing order:", error);
//         res.status(500).json({
//             message: "An unexpected error occurred while processing your order."
//         });
//     }
// };


const placeOrder = async (req, res) => {
    try {
        const { selectedAddress, paymentMethod } = req.body;

        const cartId = req.session.cart;

        // Validate cart exists
        const cart = await Cart.findById(cartId).populate('items.productId');
        if (!cart || !cart.items.length) {
            return res.status(400).json({
                message: "Your cart is empty"
            });
        }

        // Validate address
        if (!selectedAddress || !selectedAddress.name) {
            return res.status(400).json({
                message: "Please select a valid delivery address"
            });
        }

        // Validate payment method
        if (!paymentMethod || !['cod', 'razorpay'].includes(paymentMethod)) {
            return res.status(400).json({
                message: "Please select a valid payment method"
            });
        }

        // Calculate order totals and prepare order items
        let totalAmount = 0;
        const orderItems = [];

        for (const item of cart.items) {
            const product = item.productId;

            // Check if the product has enough stock
            if (item.quantity > product.stock) {
                return res.status(400).json({
                    message: `Insufficient stock for product: ${product.name}`,
                    productId: product._id
                });
            }

            // Decrease the product stock
            product.stock -= item.quantity;

            // Save the updated product stock
            await product.save();

            // Calculate total for this item
            const itemTotal = product.price * item.quantity;
            totalAmount += itemTotal;

            // Add item to order
            orderItems.push({
                productId: product._id,
                quantity: item.quantity,
                price: product.price,
                image: product.images[0], // Assuming first image is main image
                isCanceled: false
            });
        }

        const shippingFee = 10; // Your shipping fee logic here
        const payableAmount = totalAmount + shippingFee;

        // Generate unique order ID
        const orderedId = 'ORD' + Date.now() + Math.floor(Math.random() * 1000);

        // Create new order
        const newOrder = new Order({
            userId: req.session.userData.id,
            orderedId: orderedId,
            address: selectedAddress,
            items: orderItems,
            paymentStatus: paymentMethod === 'cod' ? 'Pending' : 'Pending',
            paymentMethod: paymentMethod,
            orderStatus: 'Pending',
            totalAmount: totalAmount,
            payableAmount: payableAmount,
            shippingFee: shippingFee
        });

        await newOrder.save();

        // Clear cart after successful order placement
        await Cart.findByIdAndUpdate(cartId, { $set: { items: [] } });

        res.status(200).json({
            message: "Order placed successfully!",
            orderId: newOrder._id
        });

    } catch (error) {
        console.error("Error placing order:", error);
        res.status(500).json({
            message: "An unexpected error occurred while processing your order."
        });
    }
};




const confirmationPage = async (req, res) => {
    const userData = req.session.userData || null;

    if (!userData) {
        return res.redirect("/login");
    }

    try {
        // Pass userData to the view
        res.render("success", { userData });
    } catch (error) {
        console.error("Error rendering confirmation page:", error);
        res.status(500).json({
            message: "An unexpected error occurred. Please try again later.",
        });
    }
};




const deleteProduct = async (req, res) => {
    try {
        const { cartId, productId } = req.body;
        console.log(req.body);

        if (!cartId || !productId) {
            return res.status(400).send({ success: false, message: 'Cart ID and Product ID are required' });
        }

        const updatedCart = await Cart.findByIdAndUpdate(
            cartId,
            { $pull: { items: { productId } } },
            { new: true }
        );

        if (!updatedCart) {
            return res.status(404).send({ success: false, message: 'Cart not found' });
        }

        return res.status(200).send({ success: true, message: 'Product deleted successfully', updatedCart });
    } catch (err) {
        console.error(err);
        res.status(500).send({ success: false, message: 'Error deleting product' });
    }
};

module.exports = { loadCartpage, addtocart, updatecart, loadCheckoutpage, Checkout, placeOrder, confirmationPage, deleteProduct }
