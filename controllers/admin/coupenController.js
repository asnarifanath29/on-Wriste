const Coupon = require("../../models/coupenSchema");
const mongoose = require('mongoose');

const getCoupenPage = async (req, res) => {
    try {
        const coupons = await Coupon.find({});
        
        
        res.render('coupen', { coupons });
    } catch (error) {
        console.error('Error fetching coupons:', error);
        res.status(500).json({ message: 'Error fetching coupons' });
    }
};


const createCoupon = async (req, res) => {
    try {
        const { 
            couponCode, 
            discountPercentage, 
            coupencount, 
            minPurchaseAmount, 
            maxPurchaseAmount, 
            validFrom, 
            validTo, 
            status 
        } = req.body;

        // Validation checks
        if (!couponCode || couponCode.trim() === '') {
            return res.status(400).json({ message: 'Coupon code is required' });
        }

        if (discountPercentage <= 0 || discountPercentage > 100) {
            return res.status(400).json({ message: 'Invalid discount percentage' });
        }

        if (coupencount < 0) {
            return res.status(400).json({ message: 'Invalid coupon count' });
        }

        if (minPurchaseAmount < 0 || maxPurchaseAmount < 0) {
            return res.status(400).json({ message: 'Invalid purchase amount' });
        }

        if (new Date(validFrom) > new Date(validTo)) {
            return res.status(400).json({ message: 'Invalid date range' });
        }

        // Check for existing coupon code
        const existingCoupon = await Coupon.findOne({ couponCode: couponCode.trim() });
        if (existingCoupon) {
            return res.status(400).json({ message: 'Coupon code already exists' });
        }

        // Create new coupon
        const newCoupon = new Coupon({
            couponCode: couponCode.trim(),
            discountPercentage,
            couponCount: coupencount,
            minPrice: minPurchaseAmount,
            maxDiscount: maxPurchaseAmount,
            validFrom: new Date(validFrom),
            validUpto: new Date(validTo),
            status: status === 'active'
        });

        await newCoupon.save();

        res.status(201).json({ 
            message: 'Coupon created successfully', 
            coupon: newCoupon 
        });

    } catch (error) {
        console.error('Coupon creation error:', error);
        res.status(500).json({ 
            message: 'Error creating coupon', 
            error: error.message 
        });
    }
};


const editCoupen = async (req, res) => {
    try {
        const couponId = req.params.id;
        const { 
            couponCode, 
            discountPercentage, 
            coupencount, 
            minPurchaseAmount, 
            maxPurchaseAmount, 
            validFrom, 
            validTo, 
            status 
        } = req.body;

        // Add validation
        if (!couponCode || discountPercentage < 1 || discountPercentage > 100) {
            return res.status(400).json({ 
                message: 'Invalid coupon data', 
                details: 'Check discount percentage' 
            });
        }

        const updatedCoupon = await Coupon.findByIdAndUpdate(
            couponId,
            {
                couponCode,
                discountPercentage,
                coupencount,
                minPrice: minPurchaseAmount,
                maxDiscount: maxPurchaseAmount,
                validFrom: new Date(validFrom),
                validUpto: new Date(validTo),
                status: status === 'active'
            },
            { 
                new: true,
                runValidators: true 
            }
        );

        if (!updatedCoupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        res.status(200).json(updatedCoupon);
    } catch (error) {
        console.error('Update Coupon Error:', error);
        res.status(500).json({ 
            message: 'Error updating coupon', 
            error: error.message 
        });
    }
};
  



const statusChange=async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        const updatedCoupon = await Coupon.findByIdAndUpdate(id, { status }, { new: true });
        if (!updatedCoupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }
        res.json({ message: 'Coupon status updated successfully', coupon: updatedCoupon });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to update coupon status' });
    }
};












     
 


module.exports = { getCoupenPage ,createCoupon,editCoupen,statusChange};
