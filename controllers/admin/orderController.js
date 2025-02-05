const mongoose = require("mongoose")
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema")
const Wallet = require("../../models/walletSchema")


const getOrderPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; 
        const limit = 10; 
        const skip = (page - 1) * limit;


        const orders = await Order.find()
            .populate('items.productId')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)


        const count = await Order.countDocuments();
        const totalPages = Math.ceil(count / limit);

        res.render("order", {
            orders: orders,
            currentPage: page,
            totalPages: totalPages
        });
    } catch (error) {
        console.error("Error loading profile page:", error);
        res.redirect("/pageNotFound");
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const { orderId, newStatus } = req.body;

        const validStatuses = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Canceled', 'Returned'];
        if (!validStatuses.includes(newStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status value',
            });
        }

        const order = await Order.findById(orderId).populate('items.productId');
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found',
            });
        }

        if (newStatus === 'Canceled') {
            for (const item of order.items) {
                const product = item.productId;
                if (product) {
                    product.stock += item.quantity;
                    await product.save();
                }
            }

            if (order.paymentStatus === 'Paid' ) {
                const wallet = await Wallet.findOne({ userId: order.userId });
        
                if (wallet) {
                    
                    wallet.balance += order.payableAmount;
                    wallet.transactions.push({
                        amount: order.payableAmount,
                        type: 'Credit',
                        description: `Refund for canceled order ${orderId}`
                    });
                    wallet.updatedAt = new Date();
                    await wallet.save();
                } else {
                
                    const newWallet = new Wallet({
                        userId: order.userId,
                        balance: order.payableAmount,
                        transactions: [
                            {
                                amount: order.payableAmount,
                                type: 'Credit',
                                description: `Refund for canceled order ${orderId}`
                            }
                        ]
                    });
                    await newWallet.save();
                }

               order.paymentStatus = 'Refunded';
               await order.save();
            }
        }

        order.orderStatus = newStatus;
        await order.save();

        res.json({
            success: true,
            order,
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};




const updatePaymentStatus = async (req, res) => {
    try {
        const { orderId, newStatus } = req.body;

        const validPaymentStatuses = ['Pending', 'Paid', 'Failed', 'Canceled', 'Refunded'];
        if (!validPaymentStatuses.includes(newStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment status value',
            });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found',
            });
        }

        
        // if (newStatus === 'Refunded') {
            
        // }

        order.paymentStatus = newStatus;
        await order.save();

        res.json({
            success: true,
            order,
        });
    } catch (error) {
        console.error('Error updating payment status:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};


const acceptReturn = async (req, res) => {
    const { orderId } = req.params;

    try {
        
        const order = await Order.findById(orderId);

        
        if (!order || order.orderStatus !== 'Delivered') {
            return res.status(400).json({ success: false, message: 'Invalid order status for return.' });
        }
        

        for (const item of order.items) {
            const product = await Product.findById(item.productId); 

            if (product) {
                product.stock += item.quantity;
                await product.save();
            } else {
                console.warn(`Product with ID ${item.productId} not found.`);
            }
        }


       
        if (order.paymentStatus === 'Paid') {
            const wallet = await Wallet.findOne({ userId: order.userId });

            if (wallet) {
                wallet.balance += order.payableAmount;
                wallet.transactions.push({
                    amount: order.payableAmount,
                    type: 'Credit',
                    description: `Refund for returned order ${orderId}`
                });
                wallet.updatedAt = new Date();
                await wallet.save();
            } else {
              
                const newWallet = new Wallet({
                    userId: order.userId,
                    balance: order.payableAmount,
                    transactions: [
                        {
                            amount: order.payableAmount,
                            type: 'Credit',
                            description: `Refund for returned order ${orderId}`
                        }
                    ]
                });
                await newWallet.save();
            }
        }

        order.orderStatus = 'Returned';
        order.paymentStatus ='Refunded'
        await order.save();

        res.status(200).json({ success: true, message: 'Return request accepted, and stock updated successfully.' });
    } catch (error) {
        console.error('Error accepting return:', error);
        res.status(500).json({ success: false, message: 'An error occurred while accepting the return.' });
    }
};



const rejectReturn = async (req, res) => {
    const { orderId } = req.params;

    try {
        const order = await Order.findById(orderId);

        if (!order || order.orderStatus !== 'Delivered') {
            return res.status(400).json({ success: false, message: 'Invalid order status for rejection.' });
        }

        order.orderStatus = 'Rejected';
        await order.save();

        res.status(200).json({ success: true, message: 'Return request rejected.' });
    } catch (error) {
        console.error('Error rejecting return:', error);
        res.status(500).json({ success: false, message: 'An error occurred while rejecting the return.' });
    }
};


module.exports = { getOrderPage, updateOrderStatus,acceptReturn ,rejectReturn,updatePaymentStatus}