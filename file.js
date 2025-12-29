const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const path = require("path");
const axios = require("axios");
require("dotenv").config();
const session = require("express-session");
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const customerRoutes = require("./routes/customer.routes");
const productRoutes = require("./routes/product.routes");
const cartRoutes = require("./routes/cart.routes");
const checkoutRoutes = require('./routes/checkout.routes');
app.use('/', checkoutRoutes);
const orderRoutes = require('./routes/order.routes');
app.use('/', orderRoutes);  // or app.use('/orders', orderRoutes);
const reviewRoutes = require('./routes/review.routes');
app.use('/', reviewRoutes);
const adminRoutes = require('./routes/admin.routes');
app.use('/admin', adminRoutes);
//-----------
const branchManagerRoutes = require('./routes/branchManager.routes');
app.use('/admin', branchManagerRoutes);

// Add middleware to protect admin pages after login, for example in your existing admin routes:

function adminAuthMiddleware(req, res, next) {
  if (req.session.isAdmin) {
    next();
  } else {
    res.redirect('/admin/login');
  }
}

app.use('/admin', adminAuthMiddleware, require('./routes/admin.routes'));


function adminAuthMiddleware(req, res, next) {
  if (req.session.isAdmin) {
    next();
  } else {
    res.redirect('/admin/login');
  }
}

app.use('/admin', adminAuthMiddleware, require('./routes/admin.routes'));


app.use('/images', express.static(path.join(__dirname, "pictures")));
app.use('/api/cart', cartRoutes);
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));


app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));


app.use("/api/customers", customerRoutes);
app.use("/api/products", productRoutes);
const cartController = require('./controllers/cart.controller');

app.get('/cart', cartController.viewCart);


const productController = require('./controllers/product.controller');

app.get('/product/:id', productController.getProductDetailWithReviews);




app.get("/", async (req, res) => {
    try {
        const response = await axios.get("http://localhost:3000/api/products/featured");
        const products = response.data.success ? response.data.data.slice(0, 8) : [];
        const user = req.session.user || null;

        res.render("index", {
            title: "E-Commerce Platform",
            user: user,
            products: products,
            loginSuccess: req.query.login === 'success',
            signupSuccess: req.query.signup === 'success'
        });
    } catch (err) {
        console.error('Error fetching products for homepage:', err);
        const user = req.session.user || null;
        res.render("index", {
            title: "E-Commerce Platform",
            user: user,
            products: [],
            loginSuccess: req.query.login === 'success',
            signupSuccess: req.query.signup === 'success'
        });
    }
});


app.get("/products", async (req, res) => {
    try {
        const { category, search } = req.query;
        let apiUrl = "http://localhost:3000/api/products";
        
        if (search) {
            apiUrl = "http://localhost:3000/api/products/search" + `?q=${encodeURIComponent(search)}`;
        } else if (category) {
            apiUrl += `/category/${encodeURIComponent(category)}`;
        }
        
        const response = await axios.get(apiUrl);
        const products = response.data.success ? response.data.data : [];
        
        res.render("products", {
            user: req.session.user || null,
            products: products,
            currentCategory: category || null,
            searchQuery: search || null
        });
    } catch (err) {
        console.error('Error fetching products:', err);
        res.render("products", {
            user: req.session.user || null,
            products: [],
            currentCategory: null,
            searchQuery: null,
            error: "Failed to load products"
        });
    }
});


// Category page route
app.get("/category/:category", async (req, res) => {
    try {
        const { category } = req.params;
        console.log('🌐 Frontend received category:', category);
        
        const response = await axios.get(`http://localhost:3000/api/products/category/${category}`);
        console.log('📡 API response:', response.data);
        
        const products = response.data.success ? response.data.data : [];
        
        const categoryDisplayMap = {
            'tshirts': 'T-Shirts',
            'shirts': 'Shirts', 
            'pants': 'Pants',
            'punjabi': 'Punjabi'
        };
        
        res.render("category", {
            user: req.session.user || null,
            products: products,
            category: category,
            categoryName: categoryDisplayMap[category] || category.charAt(0).toUpperCase() + category.slice(1)
        });
    } catch (err) {
        console.error('❌ Error fetching category products:', err);
        res.render("category", {
            user: req.session.user || null,
            products: [],
            category: req.params.category,
            categoryName: req.params.category.charAt(0).toUpperCase() + req.params.category.slice(1),
            error: "Failed to load products"
        });
    }
});



// Single product page route
app.get("/product/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const response = await axios.get(`http://localhost:3000/api/products/${id}`);
        
        if (!response.data.success) {
            return res.status(404).render("404", {
                user: req.session.user || null,
                message: "Product not found"
            });
        }
        
        const product = response.data.data;
        res.render("product-detail", {
            user: req.session.user || null,
            product: product
        });
    } catch (err) {
        console.error('Error fetching product:', err);
        res.status(404).render("404", {
            user: req.session.user || null,
            message: "Product not found"
        });
    }
});

// Categories overview page
app.get("/categories", async (req, res) => {
    try {
        const response = await axios.get("http://localhost:3000/api/products/categories");
        const categories = response.data.success ? response.data.data : [];
        
        res.render("categories", {
            user: req.session.user || null,
            categories: categories
        });
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.render("categories", {
            user: req.session.user || null,
            categories: [],
            error: "Failed to load categories"
        });
    }
});

// Keep all your existing authentication routes
app.get("/api/customers/me", (req, res) => {
    if (req.session.user) {
        res.json({
            success: true,
            user: {
                id: req.session.user.id,
                email: req.session.user.email
            }
        });
    } else {
        res.json({
            success: false,
            message: "Not authenticated"
        });
    }
});

app.post("/api/customers/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Could not log out"
            });
        }
        res.clearCookie('connect.sid');
        res.json({
            success: true,
            message: "Logged out successfully"
        });
    });
});

app.get("/login", (req, res) => {
    res.render("login", {
        message: req.query.error ? {
            type: "error",
            text: "Invalid email or password"
        } : req.query.signup ? {
            type: "success",
            text: "Signup successful! Please login."
        } : null
    });
});

app.post("/login", async (req, res) => {
    try {
        console.log('Frontend login attempt with:', req.body);
        const response = await axios.post("http://localhost:3000/api/customers/login", req.body);
        
        if (response.data.success) {
            req.session.user = response.data.user;
            return res.redirect("/?login=success");
        }
        return res.redirect("/login?error=1");
    } catch (err) {
        console.error("Login error:", err.response?.data || err.message);
        if (err.response?.status === 400) {
            return res.render("login", {
                messages: { error: err.response.data.message },
                formData: req.body
            });
        }
        return res.redirect("/login?error=1");
    }
});

app.get("/signup", (req, res) => {
    res.render("signup", {
        error: null,
        formData: {
            email_address: '',
            phone_number: '',
            unit_number: '',
            address_line1: '',
            city: '',
            region: '',
            postal_code: '',
            country_id: ''
        }
    });
});

app.post("/signup", async (req, res) => {
    try {
        const response = await axios.post("http://localhost:3000/api/customers", req.body);
        res.redirect("/?signup=success");
    } catch (err) {
        console.error("Signup error:", err.response?.data || err.message);
        res.render("signup", {
            error: err.response?.data?.message || "Signup failed. Please try again.",
            formData: req.body || {
                email_address: '',
                phone_number: '',
                unit_number: '',
                address_line1: '',
                city: '',
                region: '',
                postal_code: '',
                country_id: ''
            }
        });
    }
});

function requireAuth(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
}

app.get("/dashboard", requireAuth, (req, res) => {
    res.render("dashboard", {
        user: req.session.user
    });
});

app.get("/account", requireAuth, (req, res) => {
    res.render("account", {
        user: req.session.user
    });
});

app.get("/wishlist", requireAuth, (req, res) => {
    res.render("wishlist", { user: req.session.user });
});

// app.get("/cart", (req, res) => {
//     res.render("cart", { user: req.session.user || null });
// });
// app.get("/cart", cartController.viewCart);
// app.post("/cart/add", (req, res) => {
//     const { productId, name, price, image_url } = req.body;

//     if (!req.session.user) {
//         return res.redirect('/login');
//     }

//     // Initialize cart if not already
//     if (!req.session.user.cart) {
//         req.session.user.cart = [];
//     }

//     // Check if product already exists in cart
//     const existing = req.session.user.cart.find(item => item.productId === productId);
//     if (existing) {
//         existing.quantity += 1;
//     } else {
//         req.session.user.cart.push({
//             productId,
//             name,
//             price,
//             quantity: 1,
//             image_url
//         });
//     }

//     res.redirect("/cart");
// });


app.get("/contact", (req, res) => {
    res.render("contact", { user: req.session.user || null });
});

app.get("/about", (req, res) => {
    res.render("about", { user: req.session.user || null });
});

app.get("/settings", requireAuth, (req, res) => {
    res.render("settings", { user: req.session.user });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});

