const Order = require('../../models/orderSchema'); 
const Product = require('../../models/productSchema');
const Wallet=require("../../models/walletSchema")



// const cancelOrder = async (req, res) => {
//     const { orderId } = req.params;
//     const { cancelReason } = req.body;

//     try {
//         const order = await Order.findById(orderId);

//         if (!order) {
//             return res.status(404).json({ success: false, message: 'Order not found' });
//         }

//         if (order.orderStatus === 'Canceled') {
//             return res.status(400).json({ success: false, message: 'Order is already canceled.' });
//         }

//         order.orderStatus = 'Canceled';
//         order.cancelReason = cancelReason; // Store cancel reason

//         for (const item of order.items) {
//             await Product.findByIdAndUpdate(
//                 item.productId,
//                 { $inc: { stock: item.quantity } },
//                 { new: true }
//             );
//             item.isCanceled = true;
//             item.canceledItems = item.quantity;
//         }

//         await order.save();
//         res.status(200).json({ success: true, message: 'Order canceled successfully and stock updated.' });
//     } catch (error) {
//         console.error('Error canceling order:', error);
//         res.status(500).json({ success: false, message: 'An error occurred while canceling the order.' });
//     }
// };


const cancelOrder = async (req, res) => {
    const { orderId } = req.params;
    const { cancelReason } = req.body;

    try {
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.orderStatus === 'Canceled') {
            return res.status(400).json({ success: false, message: 'Order is already canceled.' });
        }

        // Update order status and cancel reason
        order.orderStatus = 'Canceled';
        order.cancelReason = cancelReason;

        // Update stock for canceled items
        for (const item of order.items) {
            await Product.findByIdAndUpdate(
                item.productId,
                { $inc: { stock: item.quantity } },
                { new: true }
            );
            item.isCanceled = true;
            item.canceledItems = item.quantity;
        }

        // Handle wallet update if payment was made and payment method is not COD
        if (order.paymentStatus === 'Paid' && order.paymentMethod !== 'cod') {
            const wallet = await Wallet.findOne({ userId: order.userId });

            if (wallet) {
                wallet.balance += order.payableAmount; // Add the order amount to the wallet
                wallet.transactions.push({
                    amount: order.payableAmount,
                    type: 'Credit',
                    description: `Refund for canceled order ${orderId}`
                });
                wallet.updatedAt = new Date();
                await wallet.save();
            } else {
                // If wallet does not exist, create a new one
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
            order.paymentStatus = "Refunded"
        }

        await order.save();
        res.status(200).json({ success: true, message: 'Order canceled successfully, stock updated, and refund processed if applicable.' });
    } catch (error) {
        console.error('Error canceling order:', error);
        res.status(500).json({ success: false, message: 'An error occurred while canceling the order.' });
    }
};


const returnOrder = async (req, res) => {
    const { orderId } = req.params;
    const { returnReason } = req.body;

    try {
        // Find the order by ID
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }

        if (order.orderStatus === 'Returned') {
            return res.status(400).json({ success: false, message: 'Order is already returned.' });
        }

        // Update order status and store the return reason
        order.orderStatus = 'Delivered';
        order.returnReason = returnReason;

        // Save the updated order
        await order.save();

        res.status(200).json({
            success: true,
            message: 'Order returned successfully, and stock updated.',
        });
    } catch (error) {
        console.error('Error processing return:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while processing the return.',
        });
    }
};






module.exports={cancelOrder,returnOrder}