const Order = require('../../models/orderSchema'); // Adjust the path as needed
const Product = require('../../models/productSchema'); // Adjust the path as needed



const cancelOrder = async (req, res) => {
    const { orderId } = req.params;

    try {
        // Find the order by ID
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Check if the order is already canceled
        if (order.orderStatus === 'Canceled') {
            return res.status(400).json({ success: false, message: 'Order is already canceled.' });
        }

        // Update the order status to "Canceled"
        order.orderStatus = 'Canceled';

        // Update all items in the order as canceled and adjust stock
        for (const item of order.items) {
            // Update stock for each product
            await Product.findByIdAndUpdate(
                item.productId,
                { $inc: { stock: item.quantity } }, // Increment the stock
                { new: true }
            );
            // Mark the item as canceled
            item.isCanceled = true;
            item.canceledItems = item.quantity;
        }

        // Save the updated order
        await order.save();

        res.status(200).json({ success: true, message: 'Order canceled successfully and stock updated.' });
    } catch (error) {
        console.error('Error canceling order:', error);
        res.status(500).json({ success: false, message: 'An error occurred while canceling the order.' });
    }
};


module.exports={cancelOrder}