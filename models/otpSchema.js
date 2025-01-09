const mongoose = require("mongoose");
const { search } = require("../app");
const { Schema } = mongoose;


const otpSchema = new mongoose.Schema({

    email: {
        type: String,
        required: true,
    },
    otp: {
        type: String,  // OTP stored as a string
        default: null
    },
    otpExpiry: {
        type: Date,  // Store OTP expiry time
        default: null,
        expires: 0
    }
});



const Otp = mongoose.model('Otp', otpSchema);
module.exports = Otp
