
const PDFDocument = require('pdfkit');
const Order = require('../../models/orderSchema');

const invoice=async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId).populate('items.productId');

        if (!order) {
            return res.status(404).send('Order not found');
        }

        const doc = new PDFDocument();
        const filename = `invoice_${order.orderedId}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        doc.pipe(res);

        doc.fontSize(25).text('Invoice', { align: 'center' });
        doc.moveDown();

        doc.fontSize(14).text(`Order ID: ${order.orderedId}`);
        doc.text(`Order Date: ${order.createdAt.toLocaleDateString()}`);
        doc.text(`Payment Method: ${order.paymentMethod.toUpperCase()}`);
        doc.text(`Order Status: ${order.orderStatus}`);
        doc.text(`Payment Status: ${order.paymentStatus}`);
        doc.moveDown();

        doc.fontSize(16).text('Billing Address:', { underline: true });
        doc.text(`Name: ${order.address.name}`);
        doc.text(`Address: ${order.address.address}`);
        doc.text(`Locality: ${order.address.locality}`);
        doc.text(`Place: ${order.address.place}`);
        // doc.text(`State: ${order.address.state}`);
        doc.text(`Pincode: ${order.address.pincode}`);
        doc.text(`Phone: ${order.address.phone}`);
        doc.moveDown();

        doc.fontSize(16).text('Order Items:', { underline: true });
        order.items.forEach((item, index) => {
            doc.text(`${index + 1}. ${item.productId.name}`);
            doc.text(`   Quantity: ${item.quantity}`);
            doc.text(`   Price: ₹${item.price.toFixed(2)}`);
            doc.moveDown();
        });

       doc.fontSize(16).text('Order Summary:', { underline: true });
       doc.text(`Total Amount: ₹${order.totalAmount.toFixed(2)}`);
       doc.text(`Shipping Fee: ₹${order.shippingFee.toFixed(2)}`);

       if (order.couponDiscount && order.couponDiscount > 0) {
           doc.text(`Coupon Discount: ₹${order.couponDiscount.toFixed(2)}`);
       }
       if (order.appliedCoupon) {
           doc.text(`Applied Coupon: ${order.appliedCoupon}`);
       }

       doc.text(`Payable Amount: ₹${order.payableAmount.toFixed(2)}`);
       doc.moveDown();

        doc.end();
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send('Error generating PDF');
    }
};

module.exports = {invoice};


 



