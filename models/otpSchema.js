const mongoose = require("mongoose");
const { search } = require("../app");
const { Schema } = mongoose;


const otpSchema = new mongoose.Schema({

    email: {
        type: String,
        required: true,
    },
    otp: {
        type: String, 
        default: null
    },
    otpExpiry: {
        type: Date, 
        default: null,
        expires: 0
    }
});



const Otp = mongoose.model('Otp', otpSchema);
module.exports = Otp
