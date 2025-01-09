const mongoose=require("mongoose")
const {Schema} = mongoose
const coupenSchema = new Schema({
    name:{
        type:String,
        required:true,
        unique:true
    },
    createdOn:{
        type:Date,
        default:Date.now,
        required:true
    },
    expireOn:{
        type:Date,
        required:true
    },
    minimumPrice:{
        type:Number,
        required:true
    },
    islist:{
        type:Boolean,
        default:true
    },
    userId:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    }]

})

const Coupen=mongoose.model("Coupen",coupenSchema)
module.exports=Coupen;
