const express = require('express');
const { connection, User, Restaurant, Order } = require('./db');
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const cookieParser = require('cookie-parser');
const app = express();
app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
    res.json("welcome")
});

// User registration
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password, address } = req.body;

        let userexists = await User.findOne({ email })
        if (userexists) res.json("Already exists")
        else {
            if (name && email && password && address) {
                let obj = {
                    name, email, password, address
                }
                let hash = bcrypt.hashSync(password, 10)
                obj.password = hash
                const user = new User(obj);
                await user.save()
                res.status(201).json("UserRegistered");
            } else {
                res.json({ msg: "Provide all details in body with", body: "name, email, password, address" })
            }
        }
    } catch (error) {
        console.error('User registration error:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

// User login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email' });
        }
        // Generate and return JWT token

        let val = bcrypt.compareSync(password, user.password)
        if (val) {
            const token = jwt.sign({ user }, "masai")
            res.cookie("token", token)
            res.status(201).json({ token });
        } else {
            res.json("Invalid password")
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to login' });
    }
});

// User password reset
app.put('/api/user/:id/reset', async (req, res) => {
    try {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById({ _id: id });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
        } else {
            let val = bcrypt.compareSync(currentPassword, user.password)
            if (val) {
                let hash = bcrypt.hashSync(newPassword, 10)
                await User.findOneAndUpdate({ _id: id }, { password: hash })
                res.json("Password Updated");
            } else {
                res.json("currentPassword is not same")
            }
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

//add restaurant
app.post('/api/addrestaurant', async (req, res) => {
    try {
        const { name, address, menu } = req.body
        let obj = {
            name, address, menu
        }
        let restaurant = new Restaurant(obj)
        await restaurant.save()
        res.status(200).json("restaurant added");
    } catch (error) {
        res.status(500).json({ error: 'Failed to get restaurants' });
    }
});
// Get all restaurants
app.get('/api/restaurants', async (req, res) => {
    try {
        const restaurants = await Restaurant.find();
        res.status(200).json(restaurants);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get restaurants' });
    }
});

// Get restaurant details
app.get('/api/restaurants/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const restaurant = await Restaurant.findById(id);
        if (!restaurant) {
            res.status(404).json({ error: 'Restaurant not found' });
        }
        res.status(200).json(restaurant);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get restaurant details' });
    }
});

// Get restaurant menu
app.get('/api/restaurants/:id/menu', async (req, res) => {
    try {
        const { id } = req.params;
        const restaurant = await Restaurant.findById(id);
        if (!restaurant) {
            return res.status(404).json({ error: 'Restaurant not found' });
        }
        const menu = restaurant.menu;
        res.status(200).json(menu);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get restaurant menu' });
    }
});

// Add item to restaurant menu
app.post('/api/restaurants/:id/menu', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, image } = req.body;
        const restaurant = await Restaurant.findById(id);
        if (!restaurant) {
            return res.status(404).json({ error: 'Restaurant not found' });
        }
        const newItem = { name, description, price, image };
        restaurant.menu.push(newItem);
        await Restaurant.findOneAndUpdate({ _id: id }, { menu: restaurant.menu })
        res.status(201).json(restaurant);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add item to restaurant menu' });
    }
});

// Delete item from restaurant menu
app.delete('/api/restaurants/:restaurantId/menu/:itemId', async (req, res) => {
    try {
        const { restaurantId, itemId } = req.params;
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            res.status(404).json({ error: 'Restaurant not found' });
        }
        let updateditems = restaurant.menu.filter((ele, i) => {
            if (itemId != ele._id) return true
        })
        await Restaurant.findOneAndUpdate({ _id: restaurantId }, { menu: updateditems })
        res.status(202).json("deleted")
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete item from restaurant menu' });
    }
});

// Place an order
app.post('/api/orders', async (req, res) => {
    try {
        const token = req.cookies.token;
        const { restaurantId, items ,userId} = req.body
        if(restaurantId&&items&&userId){
            let user=await User.findById(userId)
            let totalPrice=0
            for(let i=0;i<items.length;i++){
                totalPrice+=items[i].price*items[i].quantity
            }
            let obj = {
                user: userId,
                restaurant:restaurantId,
                items,
                totalPrice,
                deliveryAddress: user.address,
                status: "placed"
            }
            let order=new Order(obj)
            await order.save()
            res.status(201).json("Order placed")
        }else{
            res.json("Ivalid Details provided in body")
        }
    } catch (error) {
        console.error('Place an order error:', error);
        res.status(500).json({ error: 'Failed to place an order' });
    }
});

// Get order details
app.get('/api/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const order = await Order.findById(id)
            .populate('user')
            .populate('restaurant');
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.status(200).json(order);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get order details' });
    }
});

// Update order status
app.patch('/api/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        order.status = status;
        await Order.findOneAndUpdate({_id:id},{status})
        res.sendStatus(204) 
    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

// Start the server
app.listen(4500, async () => {
    try {
        await connection
        console.log("connected to db")
    } catch (error) {
        console.log(error);
    }
    console.log('Server is running on port 4500 ');
});
