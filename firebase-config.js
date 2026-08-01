/**
 * Firebase & Local-First Mock Configuration
 * 
 * To connect to a real Firebase instance:
 * 1. Fill in the `firebaseConfig` details below.
 * 2. Un-comment the Firebase SDK script tags in index.html (or let the app import them).
 * 3. Set USE_REAL_FIREBASE to true.
 */

const USE_REAL_FIREBASE = false;

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Seed Products Data
const SEED_PRODUCTS = [
  {
    id: "p1",
    name: "Apex Wireless Over-Ear Headphones",
    description: "Experience high-fidelity sound, active noise cancellation, and up to 40 hours of battery life with these premium wireless headphones. Ergonomically designed with memory foam earcups for ultimate long-session comfort.",
    price: 199.99,
    category: "Electronics",
    image: "./assets/headphones.jpg",
    rating: 4.8,
    reviewsCount: 124,
    stock: 25
  },
  {
    id: "p2",
    name: "Nexus Bezel-Less Smartphone",
    description: "A cutting-edge smartphone featuring a stunning 6.7-inch OLED display, high-capacity battery, and an advanced triple-lens camera system for capturing breathtaking photos in any light condition.",
    price: 899.99,
    category: "Electronics",
    image: "./assets/smartphone.jpg",
    rating: 4.7,
    reviewsCount: 89,
    stock: 15
  },
  {
    id: "p3",
    name: "Nomad Minimalist Leather Wallet",
    description: "Handcrafted from genuine top-grain leather, this ultra-slim bi-fold wallet stores up to 10 cards and cash securely with integrated RFID-blocking technology. Designed to fit comfortably in front pockets.",
    price: 49.99,
    category: "Accessories",
    image: "./assets/wallet.jpg",
    rating: 4.5,
    reviewsCount: 215,
    stock: 50
  },
  {
    id: "p4",
    name: "Vortex RGB Mechanical Keyboard",
    description: "A tactile mechanical keyboard with customizable RGB backlighting, hot-swappable switches, and a premium aluminum frame. The perfect companion for both professional typists and gaming enthusiasts.",
    price: 129.99,
    category: "Electronics",
    image: "./assets/keyboard.jpg",
    rating: 4.9,
    reviewsCount: 67,
    stock: 30
  },
  {
    id: "p5",
    name: "Horizon Smart Fitness Watch",
    description: "Track your workouts, heart rate, sleep quality, and receive real-time notifications on this sleek, water-resistant smart fitness watch. Features a vibrant AMOLED display and 7-day battery life.",
    price: 179.99,
    category: "Electronics",
    image: "./assets/watch.jpg",
    rating: 4.6,
    reviewsCount: 142,
    stock: 40
  },
  {
    id: "p6",
    name: "Aviator Gradient Sunglasses",
    description: "Timeless aviator sunglasses featuring a lightweight metallic frame, UV400 protective polarized lenses, and a comfortable fit. Stylish protection for sunny days and driving.",
    price: 79.99,
    category: "Accessories",
    image: "./assets/sunglasses.jpg",
    rating: 4.4,
    reviewsCount: 95,
    stock: 60
  }
];

// Helper to interact with Local Storage for Mocking
class MockDatabase {
  constructor() {
    this.init();
  }

  init() {
    if (!localStorage.getItem("ec_products")) {
      localStorage.setItem("ec_products", JSON.stringify(SEED_PRODUCTS));
    }
    if (!localStorage.getItem("ec_users")) {
      localStorage.setItem("ec_users", JSON.stringify([]));
    }
    if (!localStorage.getItem("ec_orders")) {
      localStorage.setItem("ec_orders", JSON.stringify([]));
    }
    if (!localStorage.getItem("ec_active_user")) {
      localStorage.setItem("ec_active_user", null);
    }
    if (!localStorage.getItem("ec_carts")) {
      localStorage.setItem("ec_carts", JSON.stringify({}));
    }
  }

  getProducts() {
    return JSON.parse(localStorage.getItem("ec_products"));
  }

  updateProductStock(productId, qtyDeducted) {
    const products = this.getProducts();
    const product = products.find(p => p.id === productId);
    if (product) {
      product.stock = Math.max(0, product.stock - qtyDeducted);
      localStorage.setItem("ec_products", JSON.stringify(products));
    }
  }

  getUsers() {
    return JSON.parse(localStorage.getItem("ec_users"));
  }

  saveUsers(users) {
    localStorage.setItem("ec_users", JSON.stringify(users));
  }

  getActiveUser() {
    return JSON.parse(localStorage.getItem("ec_active_user"));
  }

  setActiveUser(user) {
    localStorage.setItem("ec_active_user", JSON.stringify(user));
  }

  getCarts() {
    return JSON.parse(localStorage.getItem("ec_carts"));
  }

  saveCarts(carts) {
    localStorage.setItem("ec_carts", JSON.stringify(carts));
  }

  getOrders() {
    return JSON.parse(localStorage.getItem("ec_orders"));
  }

  saveOrders(orders) {
    localStorage.setItem("ec_orders", JSON.stringify(orders));
  }
}

const mockDb = new MockDatabase();

// Setup Global E-Commerce SDK Object
window.ecommerceSDK = {
  isMock: !USE_REAL_FIREBASE,

  // AUTHENTICATION
  auth: {
    listeners: [],
    
    onAuthStateChanged(callback) {
      this.listeners.push(callback);
      // Trigger initial call with current user
      setTimeout(() => {
        callback(mockDb.getActiveUser());
      }, 0);
      return () => {
        this.listeners = this.listeners.filter(l => l !== callback);
      };
    },

    notifyListeners(user) {
      this.listeners.forEach(callback => callback(user));
    },

    signup(email, password, displayName) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const users = mockDb.getUsers();
          if (users.find(u => u.email === email)) {
            reject(new Error("Email already registered."));
            return;
          }
          const newUser = {
            uid: "u_" + Date.now(),
            email,
            displayName: displayName || email.split("@")[0],
            createdAt: new Date().toISOString()
          };
          users.push({ ...newUser, password }); // Password stored for mock login check
          mockDb.saveUsers(users);
          mockDb.setActiveUser(newUser);
          this.notifyListeners(newUser);
          resolve(newUser);
        }, 800);
      });
    },

    login(email, password) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const users = mockDb.getUsers();
          const user = users.find(u => u.email === email && u.password === password);
          if (!user) {
            reject(new Error("Invalid email or password."));
            return;
          }
          const safeUser = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            createdAt: user.createdAt
          };
          mockDb.setActiveUser(safeUser);
          this.notifyListeners(safeUser);
          resolve(safeUser);
        }, 800);
      });
    },

    logout() {
      return new Promise((resolve) => {
        setTimeout(() => {
          mockDb.setActiveUser(null);
          this.notifyListeners(null);
          resolve();
        }, 400);
      });
    },

    getCurrentUser() {
      return mockDb.getActiveUser();
    }
  },

  // DATABASE / FIRESTORE
  db: {
    // PRODUCTS
    products: {
      getAll() {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(mockDb.getProducts());
          }, 300);
        });
      },

      getById(id) {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            const products = mockDb.getProducts();
            const product = products.find(p => p.id === id);
            if (product) {
              resolve(product);
            } else {
              reject(new Error("Product not found."));
            }
          }, 200);
        });
      }
    },

    // CART
    cart: {
      get(userId) {
        return new Promise((resolve) => {
          setTimeout(() => {
            const carts = mockDb.getCarts();
            resolve(carts[userId] || []);
          }, 200);
        });
      },

      save(userId, items) {
        return new Promise((resolve) => {
          setTimeout(() => {
            const carts = mockDb.getCarts();
            carts[userId] = items;
            mockDb.saveCarts(carts);
            resolve(items);
          }, 200);
        });
      },

      add(userId, product, quantity = 1) {
        return new Promise((resolve) => {
          setTimeout(() => {
            const carts = mockDb.getCarts();
            let items = carts[userId] || [];
            const existing = items.find(item => item.product.id === product.id);
            if (existing) {
              existing.quantity += quantity;
            } else {
              items.push({ product, quantity });
            }
            carts[userId] = items;
            mockDb.saveCarts(carts);
            resolve(items);
          }, 250);
        });
      },

      updateQuantity(userId, productId, quantity) {
        return new Promise((resolve) => {
          setTimeout(() => {
            const carts = mockDb.getCarts();
            let items = carts[userId] || [];
            const existing = items.find(item => item.product.id === productId);
            if (existing) {
              existing.quantity = Math.max(1, quantity);
            }
            carts[userId] = items;
            mockDb.saveCarts(carts);
            resolve(items);
          }, 200);
        });
      },

      remove(userId, productId) {
        return new Promise((resolve) => {
          setTimeout(() => {
            const carts = mockDb.getCarts();
            let items = carts[userId] || [];
            items = items.filter(item => item.product.id !== productId);
            carts[userId] = items;
            mockDb.saveCarts(carts);
            resolve(items);
          }, 200);
        });
      },

      clear(userId) {
        return new Promise((resolve) => {
          setTimeout(() => {
            const carts = mockDb.getCarts();
            carts[userId] = [];
            mockDb.saveCarts(carts);
            resolve([]);
          }, 150);
        });
      }
    },

    // ORDERS
    orders: {
      create(userId, orderData) {
        return new Promise((resolve) => {
          setTimeout(() => {
            const orders = mockDb.getOrders();
            const newOrder = {
              id: "ord_" + Math.random().toString(36).substr(2, 9).toUpperCase(),
              userId,
              ...orderData,
              status: "Processing",
              createdAt: new Date().toISOString()
            };
            
            // Deduct stock
            newOrder.items.forEach(item => {
              mockDb.updateProductStock(item.product.id, item.quantity);
            });

            orders.push(newOrder);
            mockDb.saveOrders(orders);
            resolve(newOrder);
          }, 800);
        });
      },

      getByUser(userId) {
        return new Promise((resolve) => {
          setTimeout(() => {
            const orders = mockDb.getOrders();
            const userOrders = orders.filter(o => o.userId === userId);
            // Sort by newest first
            userOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            resolve(userOrders);
          }, 300);
        });
      }
    }
  }
};
