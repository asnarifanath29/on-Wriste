const mongoose=require("mongoose")
const env=require("dotenv").config();
mongoose.set('strictQuery', false);
const connectDB = async ()=>{
    try {
        console.log("Attempting to connect to MongoDB...");
        const connection = await mongoose.connect('mongodb+srv://asnarifanath:VPeqfrFIt3eDiwBc@asna.7bcpy.mongodb.net/onwriste?retryWrites=true&w=majority', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4  
        });
        console.log(`MongoDB Connected: ${connection.connection.host}`);
    } catch (error) {
        console.log("DB Connection error details:", {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        process.exit(1);
    }
}
mongoose.connection.on('error', err => {
    console.log('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected');
});


module.exports=connectDB