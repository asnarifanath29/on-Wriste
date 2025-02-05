const PDFDocument = require('pdfkit');
const Excel = require('exceljs');
const Order = require('../../models/orderSchema'); 

const generateDateRange = (type, startDate, endDate) => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    switch (type) {
        case 'daily':
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'weekly':
            start.setDate(now.getDate() - now.getDay());
            end.setDate(start.getDate() + 6);
            break;
        case 'monthly':
            start.setDate(1);
            end.setMonth(start.getMonth() + 1, 0);
            break;
        case 'yearly':
            start.setMonth(0, 1);
            end.setMonth(11, 31);
            break;
        case 'custom':
            return { start: new Date(startDate), end: new Date(endDate) };
    }
    return { start, end };
};

const calculateMetrics = (orders) => {
    return orders.reduce((metrics, order) => {
        metrics.totalSales++;
        metrics.totalRevenue += order.totalAmount || 0;
        metrics.totalCouponDiscount += order.couponDiscount || 0;
        // metrics.totalOfferDiscount += order.offerDiscount || 0;  
        metrics.netRevenue += order.payableAmount || 0;
        
        // Track payment methods
        metrics.paymentMethods[order.paymentMethod] = 
            (metrics.paymentMethods[order.paymentMethod] || 0) + 1;
        
        // Track order status
        metrics.orderStatus[order.orderStatus] = 
            (metrics.orderStatus[order.orderStatus] || 0) + 1;
        
        return metrics;
    }, {
        totalSales: 0,
        totalRevenue: 0,
        totalCouponDiscount: 0,
        // totalOfferDiscount: 0,
        netRevenue: 0,
        paymentMethods: {},
        orderStatus: {}
    });
};

const salesReportController = {
    downloadPDF: async (req, res) => {
        try {
            const { type, startDate, endDate } = req.query;
            const dateRange = generateDateRange(type, startDate, endDate);

            const orders = await Order.find({
                createdAt: { $gte: dateRange.start, $lte: dateRange.end }
            }).sort({ createdAt: -1 });

            const metrics = calculateMetrics(orders);

            const doc = new PDFDocument({ margin: 50 });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=sales-report-${type}.pdf`);

            doc.pipe(res);

            doc.fontSize(20)
               .font('Helvetica-Bold')
               .text('Onwriste Watch Shop Sales Report', { align: 'center' });
            
            doc.moveDown();
            doc.fontSize(12)
               .font('Helvetica')
               .text(`Report Period: ${type.charAt(0).toUpperCase() + type.slice(1)}`, { align: 'center' });
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });

            doc.moveDown();

            doc.fontSize(16)
               .font('Helvetica-Bold')
               .text('Summary Metrics', { underline: true });
            
            doc.moveDown();
            doc.fontSize(12)
               .font('Helvetica');

            const metrics_data = [
                ['Total Sales Count:', metrics.totalSales],
                ['Total Revenue:', `₹${metrics.totalRevenue.toFixed(2)}`],
                ['Total Coupon Discounts:', `₹${metrics.totalCouponDiscount.toFixed(2)}`],
                // ['Total Offer Discounts:', `$${metrics.totalOfferDiscount.toFixed(2)}`],
                ['Net Revenue:', `₹${metrics.netRevenue.toFixed(2)}`]
            ];

            let yPos = doc.y + 10;
            metrics_data.forEach(([label, value]) => {
                doc.text(label, 50, yPos);
                doc.text(value, 250, yPos);
                yPos += 20;
            });

            doc.moveDown(2);

            doc.fontSize(16)
               .font('Helvetica-Bold')
               .text('Order Details', { underline: true });
            
            doc.moveDown();

            const tableTop = doc.y + 10;
            const headers = ['Date', 'Order ID', 'Amount', 'Status'];
            const columnWidth = 120;

            headers.forEach((header, i) => {
                doc.fontSize(10)
                   .font('Helvetica-Bold')
                   .text(header, 50 + (i * columnWidth), tableTop, { width: columnWidth });
            });

            let rowTop = tableTop + 20;
            orders.forEach((order, i) => {
                if (rowTop > doc.page.height - 50) {
                    doc.addPage();
                    rowTop = 50;
                }

                doc.fontSize(9)
                   .font('Helvetica')
                   .text(new Date(order.createdAt).toLocaleDateString(), 50, rowTop, { width: columnWidth })
                   .text(order.orderedId, 50 + columnWidth, rowTop, { width: columnWidth })
                   .text(`₹${order.payableAmount.toFixed(2)}`, 50 + (columnWidth * 2), rowTop, { width: columnWidth })
                   .text(order.orderStatus, 50 + (columnWidth * 3), rowTop, { width: columnWidth });

                rowTop += 20;
            });

            doc.end();

        } catch (error) {
            console.error('PDF generation error:', error);
            res.status(500).json({ error: 'Failed to generate PDF report' });
        }
    },

    downloadExcel: async (req, res) => {
        try {
            const { type, startDate, endDate } = req.query;
            const dateRange = generateDateRange(type, startDate, endDate);

            const orders = await Order.find({
                createdAt: { $gte: dateRange.start, $lte: dateRange.end }
            }).sort({ createdAt: -1 });

            const metrics = calculateMetrics(orders);

            const workbook = new Excel.Workbook();

            const summarySheet = workbook.addWorksheet('Summary');
            summarySheet.columns = [
                { header: 'Metric', key: 'metric', width: 30 },
                { header: 'Value', key: 'value', width: 20 }
            ];

            summarySheet.getRow(1).font = { bold: true, size: 12 };
            summarySheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4F81BD' }
            };
            summarySheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

            summarySheet.addRows([
                { metric: 'Report Type', value: type.charAt(0).toUpperCase() + type.slice(1) },
                { metric: 'Total Sales Count', value: metrics.totalSales },
                { metric: 'Total Revenue', value: metrics.totalRevenue },
                { metric: 'Total Coupon Discounts', value: metrics.totalCouponDiscount },
                // { metric: 'Total Offer Discounts', value: metrics.totalOfferDiscount },
                { metric: 'Net Revenue', value: metrics.netRevenue }
            ]);

            const ordersSheet = workbook.addWorksheet('Order Details');
            ordersSheet.columns = [
                { header: 'Date', key: 'date', width: 15 },
                { header: 'Order ID', key: 'orderId', width: 15 },
                { header: 'Customer Name', key: 'customerName', width: 20 },
                { header: 'Subtotal', key: 'subtotal', width: 15 },
                { header: 'Coupon Discount', key: 'couponDiscount', width: 15 },
                { header: 'Offer Discount', key: 'offerDiscount', width: 15 },
                { header: 'Total Amount', key: 'totalAmount', width: 15 },
                { header: 'Status', key: 'status', width: 15 }
            ];

            ordersSheet.getRow(1).font = { bold: true, size: 12 };
            ordersSheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4F81BD' }
            };
            ordersSheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

            orders.forEach(order => {
                ordersSheet.addRow({
                    date: new Date(order.createdAt).toLocaleDateString(),
                    orderId: order.orderedId,
                    customerName: order.customerName,
                    subtotal: order.totalAmount,
                    couponDiscount: order.couponDiscount,
                    offerDiscount: order.offerDiscount,
                    totalAmount: order.payableAmount,
                    status: order.orderStatus
                });
            });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=sales-report-${type}.xlsx`);

            const buffer = await workbook.xlsx.writeBuffer();
        
            res.send(buffer);
        } catch (error) {
            console.error('Excel generation error:', error);
            res.status(500).json({ error: 'Failed to generate Excel report' });
        }
    }
};

module.exports = salesReportController;