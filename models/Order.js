const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderID: { type: Number, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  orderDate: { type: Date, default: Date.now },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  adminComments: { type: String },
}, { strictPopulate: false });

// Pre-save hook to generate sequential order IDs
orderSchema.pre('save', async function (next) {
  if (!this.orderID) {
    try {
      const lastOrder = await mongoose.model('Order').findOne({}, {}, { sort: { 'orderID': -1 } });
      const newOrderID = lastOrder ? lastOrder.orderID + 1 : 1;
      this.orderID = newOrderID;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
