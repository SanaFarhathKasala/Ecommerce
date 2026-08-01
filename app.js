/**
 * Vortex E-Commerce - Core Application Script
 */

class VortexApp {
  constructor() {
    this.state = {
      currentUser: null,
      cart: [],
      products: [],
      searchQuery: '',
      activeCategory: 'All',
      sortBy: 'default'
    };

    this.init();
  }

  async init() {
    this.initDOMReferences();
    this.initTheme();
    this.initEventListeners();
    this.initAuthObserver();
  }

  initDOMReferences() {
    this.appView = document.getElementById('app-view');
    this.cartDrawer = document.getElementById('cart-drawer');
    this.cartOverlay = document.getElementById('cart-overlay');
    this.cartBadge = document.getElementById('cart-badge');
    this.cartDrawerItems = document.getElementById('cart-drawer-items');
    this.cartSubtotal = document.getElementById('cart-subtotal');
    this.cartTotal = document.getElementById('cart-total');
    this.drawerCheckoutBtn = document.getElementById('drawer-checkout-btn');
    this.themeToggle = document.getElementById('theme-toggle');
    this.searchInput = document.getElementById('search-input');
    this.categoryContainer = document.getElementById('category-container');
    this.authStateContainer = document.getElementById('auth-state-container');
  }

  initTheme() {
    const savedTheme = localStorage.getItem('vortex-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeToggleIcon(savedTheme);
  }

  updateThemeToggleIcon(theme) {
    const icon = this.themeToggle.querySelector('i');
    if (theme === 'dark') {
      icon.className = 'fa-solid fa-sun';
    } else {
      icon.className = 'fa-solid fa-moon';
    }
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('vortex-theme', newTheme);
    this.updateThemeToggleIcon(newTheme);
    this.showToast(`Switched to ${newTheme} mode`, 'success');
  }

  initEventListeners() {
    // Theme Toggle
    this.themeToggle.addEventListener('click', () => this.toggleTheme());

    // Cart Drawer Toggle
    document.getElementById('cart-trigger').addEventListener('click', () => this.openCart());
    document.getElementById('cart-close').addEventListener('click', () => this.closeCart());
    this.cartOverlay.addEventListener('click', () => this.closeCart());

    // Search bar functionality
    this.searchInput.addEventListener('input', (e) => {
      this.state.searchQuery = e.target.value;
      if (window.location.hash !== '#home' && window.location.hash !== '') {
        window.location.hash = '#home';
      } else {
        this.renderHome();
      }
    });

    // Category selection tabs
    this.categoryContainer.addEventListener('click', (e) => {
      const tab = e.target.closest('.category-tab');
      if (!tab) return;
      e.preventDefault();
      
      // Update active tab styles
      this.categoryContainer.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      this.state.activeCategory = tab.dataset.category;
      
      if (window.location.hash !== '#home' && window.location.hash !== '') {
        window.location.hash = '#home';
      } else {
        this.renderHome();
      }
    });

    // Checkout button inside cart drawer
    this.drawerCheckoutBtn.addEventListener('click', () => {
      this.closeCart();
      if (!this.state.currentUser) {
        this.showToast('Please sign in to proceed with checkout', 'error');
        window.location.hash = '#auth';
      } else {
        window.location.hash = '#checkout';
      }
    });

    // Hash Routing Change
    window.addEventListener('hashchange', () => this.route());
  }

  initAuthObserver() {
    window.ecommerceSDK.auth.onAuthStateChanged(async (user) => {
      this.state.currentUser = user;
      this.updateNavbarAuth();
      if (user) {
        // Load cart
        const cartItems = await window.ecommerceSDK.db.cart.get(user.uid);
        this.state.cart = cartItems;
      } else {
        this.state.cart = [];
      }
      this.updateCartUI();
      this.route();
    });
  }

  updateNavbarAuth() {
    if (this.state.currentUser) {
      const displayName = this.state.currentUser.displayName || this.state.currentUser.email;
      this.authStateContainer.innerHTML = `
        <div class="profile-menu-container">
          <button class="profile-btn" id="profile-menu-trigger" aria-label="User profile">
            <i class="fa-solid fa-user-astronaut" style="font-size: 1.2rem;"></i>
          </button>
          <div class="profile-menu" id="profile-dropdown">
            <div style="padding: 1rem; border-bottom: 1px solid var(--border-color); font-weight: 600; font-size: 0.9rem;">
              Hey, ${displayName}
            </div>
            <a href="#orders"><i class="fa-solid fa-receipt"></i> Order History</a>
            <a href="#profile"><i class="fa-solid fa-circle-user"></i> My Profile</a>
            <div class="menu-divider"></div>
            <button id="logout-btn"><i class="fa-solid fa-right-from-bracket"></i> Sign Out</button>
          </div>
        </div>
      `;

      // Profile dropdown interactivity
      const trigger = document.getElementById('profile-menu-trigger');
      const dropdown = document.getElementById('profile-dropdown');
      
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdown.style.display === 'flex';
        dropdown.style.display = isOpen ? 'none' : 'flex';
      });

      document.addEventListener('click', () => {
        dropdown.style.display = 'none';
      });

      document.getElementById('logout-btn').addEventListener('click', async () => {
        try {
          await window.ecommerceSDK.auth.logout();
          this.showToast('Successfully logged out', 'success');
          window.location.hash = '#home';
        } catch (error) {
          this.showToast(error.message, 'error');
        }
      });
    } else {
      this.authStateContainer.innerHTML = `
        <button class="auth-btn auth-btn-secondary" onclick="location.hash='#auth'" style="margin-right: 0.5rem;">Log In</button>
        <button class="auth-btn auth-btn-primary" onclick="window.setAuthViewMode('signup')">Sign Up</button>
      `;
    }
  }

  openCart() {
    this.cartDrawer.classList.add('open');
    this.cartOverlay.classList.add('open');
  }

  closeCart() {
    this.cartDrawer.classList.remove('open');
    this.cartOverlay.classList.remove('open');
  }

  async updateCartUI() {
    const totalItems = this.state.cart.reduce((sum, item) => sum + item.quantity, 0);
    if (totalItems > 0) {
      this.cartBadge.innerText = totalItems;
      this.cartBadge.style.display = 'flex';
      this.drawerCheckoutBtn.disabled = false;
    } else {
      this.cartBadge.style.display = 'none';
      this.drawerCheckoutBtn.disabled = true;
    }

    if (this.state.cart.length === 0) {
      this.cartDrawerItems.innerHTML = `
        <div class="cart-drawer-empty">
          <i class="fa-solid fa-basket-shopping"></i>
          <p>Your shopping cart is empty.</p>
          <button class="auth-btn auth-btn-primary" onclick="window.app.closeCart(); location.hash='#home';">Start Shopping</button>
        </div>
      `;
      this.cartSubtotal.innerText = '$0.00';
      this.cartTotal.innerText = '$0.00';
      return;
    }

    let html = '';
    let subtotal = 0;

    this.state.cart.forEach(item => {
      const p = item.product;
      const itemTotal = p.price * item.quantity;
      subtotal += itemTotal;

      html += `
        <div class="cart-item">
          <img src="${p.image}" alt="${p.name}" class="cart-item-img">
          <div class="cart-item-info">
            <h4 class="cart-item-title">${p.name}</h4>
            <div class="cart-item-price">$${p.price.toFixed(2)}</div>
            <div class="cart-item-controls">
              <div class="cart-item-qty">
                <button class="cart-item-qty-btn" onclick="window.app.updateCartQty('${p.id}', ${item.quantity - 1})">-</button>
                <div class="cart-item-qty-val">${item.quantity}</div>
                <button class="cart-item-qty-btn" onclick="window.app.updateCartQty('${p.id}', ${item.quantity + 1})">+</button>
              </div>
              <button class="cart-item-remove" onclick="window.app.removeCartItem('${p.id}')">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    });

    this.cartDrawerItems.innerHTML = html;
    this.cartSubtotal.innerText = `$${subtotal.toFixed(2)}`;
    this.cartTotal.innerText = `$${subtotal.toFixed(2)}`;
  }

  async addProductToCart(productId, quantity = 1) {
    if (!this.state.currentUser) {
      this.showToast('Please sign in to manage your cart', 'error');
      window.location.hash = '#auth';
      return;
    }

    try {
      const product = this.state.products.find(p => p.id === productId) || 
                      await window.ecommerceSDK.db.products.getById(productId);

      if (product.stock <= 0) {
        this.showToast('Sorry, this product is out of stock.', 'error');
        return;
      }

      const existingCartItem = this.state.cart.find(item => item.product.id === productId);
      if (existingCartItem && (existingCartItem.quantity + quantity) > product.stock) {
        this.showToast(`Cannot add more. Limit available: ${product.stock}`, 'warning');
        return;
      }

      const updatedCart = await window.ecommerceSDK.db.cart.add(this.state.currentUser.uid, product, quantity);
      this.state.cart = updatedCart;
      this.updateCartUI();
      this.showToast(`${product.name} added to cart!`, 'success');
      this.openCart();
    } catch (error) {
      this.showToast(error.message, 'error');
    }
  }

  async updateCartQty(productId, newQty) {
    if (!this.state.currentUser) return;
    if (newQty <= 0) {
      await this.removeCartItem(productId);
      return;
    }

    try {
      const product = await window.ecommerceSDK.db.products.getById(productId);
      if (newQty > product.stock) {
        this.showToast(`Only ${product.stock} items in stock.`, 'warning');
        return;
      }

      const updatedCart = await window.ecommerceSDK.db.cart.updateQuantity(this.state.currentUser.uid, productId, newQty);
      this.state.cart = updatedCart;
      this.updateCartUI();
    } catch (error) {
      this.showToast(error.message, 'error');
    }
  }

  async removeCartItem(productId) {
    if (!this.state.currentUser) return;
    try {
      const updatedCart = await window.ecommerceSDK.db.cart.remove(this.state.currentUser.uid, productId);
      this.state.cart = updatedCart;
      this.updateCartUI();
      this.showToast('Product removed from cart', 'success');
    } catch (error) {
      this.showToast(error.message, 'error');
    }
  }

  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconClass = 'fa-circle-check';
    if (type === 'error') iconClass = 'fa-circle-exclamation';
    if (type === 'warning') iconClass = 'fa-triangle-exclamation';

    toast.innerHTML = `
      <i class="fa-solid ${iconClass}"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideInRight var(--transition-fast) reverse forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // Routing and views
  async route() {
    const hash = window.location.hash || '#home';
    
    // Set active category filter bar visual states if navigating away
    if (hash === '#home') {
      const activeTab = this.categoryContainer.querySelector(`[data-category="${this.state.activeCategory}"]`);
      if (activeTab) {
        this.categoryContainer.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
        activeTab.classList.add('active');
      }
    }

    if (hash.startsWith('#product/')) {
      const id = hash.split('/')[1];
      this.renderProductDetail(id);
    } else if (hash === '#checkout') {
      this.renderCheckout();
    } else if (hash === '#orders') {
      this.renderOrders();
    } else if (hash === '#auth') {
      this.renderAuth();
    } else if (hash === '#profile') {
      this.renderProfile();
    } else {
      // Default to Home
      this.renderHome();
    }
  }

  async renderHome() {
    this.appView.innerHTML = '<div class="spinner"></div>';
    
    try {
      this.state.products = await window.ecommerceSDK.db.products.getAll();
      let filtered = [...this.state.products];

      // Search Filter
      if (this.state.searchQuery) {
        const query = this.state.searchQuery.toLowerCase();
        filtered = filtered.filter(p => 
          p.name.toLowerCase().includes(query) || 
          p.description.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query)
        );
      }

      // Category Filter
      if (this.state.activeCategory && this.state.activeCategory !== 'All') {
        filtered = filtered.filter(p => p.category === this.state.activeCategory);
      }

      // Sorting
      if (this.state.sortBy === 'price-low') {
        filtered.sort((a, b) => a.price - b.price);
      } else if (this.state.sortBy === 'price-high') {
        filtered.sort((a, b) => b.price - a.price);
      } else if (this.state.sortBy === 'rating') {
        filtered.sort((a, b) => b.rating - a.rating);
      }

      let gridHtml = '';
      filtered.forEach(p => {
        const outOfStock = p.stock === 0;
        const lowStock = p.stock > 0 && p.stock < 10;
        const badge = outOfStock ? 'Out of Stock' : (lowStock ? 'Low Stock' : '');

        gridHtml += `
          <div class="product-card" onclick="location.hash='#product/${p.id}'">
            <div class="card-img-wrapper">
              <img src="${p.image}" alt="${p.name}" class="card-img" loading="lazy">
              ${badge ? `<span class="card-badge" style="background: ${outOfStock ? 'var(--error-color)' : 'var(--rating-color)'};">${badge}</span>` : ''}
            </div>
            <div class="card-info">
              <span class="card-category">${p.category}</span>
              <h3 class="card-title">${p.name}</h3>
              <div class="card-rating">
                <i class="fa-solid fa-star"></i>
                <span>${p.rating.toFixed(1)} (${p.reviewsCount})</span>
              </div>
              <div class="card-footer">
                <span class="card-price">$${p.price.toFixed(2)}</span>
                <button class="add-to-cart-btn" aria-label="Add to cart" 
                        onclick="event.stopPropagation(); window.app.addProductToCart('${p.id}')"
                        ${outOfStock ? 'disabled style="background: var(--border-color); cursor: not-allowed;"' : ''}>
                  <i class="fa-solid fa-plus"></i>
                </button>
              </div>
            </div>
          </div>
        `;
      });

      this.appView.innerHTML = `
        <div class="catalog-header">
          <div class="catalog-title">
            <h1>${this.state.activeCategory === 'All' ? 'Premium Catalog' : this.state.activeCategory}</h1>
            <p style="color: var(--text-secondary); font-size: 0.95rem;">Showing ${filtered.length} products</p>
          </div>
          <div class="catalog-filters">
            <label style="font-size: 0.9rem; font-weight: 600; color: var(--text-secondary);">Sort By:</label>
            <select class="filter-select" id="sort-select">
              <option value="default" ${this.state.sortBy === 'default' ? 'selected' : ''}>Featured</option>
              <option value="price-low" ${this.state.sortBy === 'price-low' ? 'selected' : ''}>Price: Low to High</option>
              <option value="price-high" ${this.state.sortBy === 'price-high' ? 'selected' : ''}>Price: High to Low</option>
              <option value="rating" ${this.state.sortBy === 'rating' ? 'selected' : ''}>Customer Rating</option>
            </select>
          </div>
        </div>

        ${filtered.length === 0 ? `
          <div style="text-align: center; padding: 4rem; color: var(--text-secondary);">
            <i class="fa-solid fa-box-open" style="font-size: 4rem; margin-bottom: 1.5rem; color: var(--border-color)"></i>
            <h3>No products found match your criteria.</h3>
            <p>Try resetting filters or changing your search terms.</p>
          </div>
        ` : `
          <div class="product-grid">
            ${gridHtml}
          </div>
        `}
      `;

      // Bind sort listener
      document.getElementById('sort-select').addEventListener('change', (e) => {
        this.state.sortBy = e.target.value;
        this.renderHome();
      });

    } catch (error) {
      this.appView.innerHTML = `<div style="color: var(--error-color); text-align: center; padding: 2rem;">Error loading products: ${error.message}</div>`;
    }
  }

  async renderProductDetail(id) {
    this.appView.innerHTML = '<div class="spinner"></div>';
    
    try {
      const p = await window.ecommerceSDK.db.products.getById(id);
      const isOutOfStock = p.stock === 0;

      this.appView.innerHTML = `
        <div style="margin-bottom: 2rem;">
          <a href="#home" style="color: var(--text-secondary); font-weight: 500; display: inline-flex; align-items: center; gap: 0.5rem;">
            <i class="fa-solid fa-arrow-left-long"></i> Back to products
          </a>
        </div>

        <div class="detail-container">
          <div class="detail-gallery">
            <img src="${p.image}" alt="${p.name}" class="detail-img">
          </div>
          <div class="detail-info">
            <span class="detail-category">${p.category}</span>
            <h1 class="detail-title">${p.name}</h1>
            
            <div class="detail-meta">
              <div class="detail-rating">
                <i class="fa-solid fa-star"></i>
                <span>${p.rating.toFixed(1)} (${p.reviewsCount} reviews)</span>
              </div>
              <div class="detail-stock">
                <i class="fa-solid ${isOutOfStock ? 'fa-circle-xmark stock-out' : 'fa-circle-check stock-in'}"></i>
                <span class="${isOutOfStock ? 'stock-out' : 'stock-in'}">
                  ${isOutOfStock ? 'Out of Stock' : `In Stock (${p.stock} available)`}
                </span>
              </div>
            </div>

            <div class="detail-price">$${p.price.toFixed(2)}</div>
            <p class="detail-description">${p.description}</p>

            <div class="detail-actions">
              <div class="qty-selector">
                <button class="qty-btn" id="qty-minus" ${isOutOfStock ? 'disabled' : ''}>-</button>
                <div class="qty-val" id="detail-qty-val">1</div>
                <button class="qty-btn" id="qty-plus" ${isOutOfStock ? 'disabled' : ''}>+</button>
              </div>
              <button class="buy-btn" id="add-to-cart-detail" ${isOutOfStock ? 'disabled' : ''}>
                <i class="fa-solid fa-bag-shopping"></i> Add to Cart
              </button>
            </div>
            
            <div style="border-top: 1px solid var(--border-color); padding-top: 1.5rem; display: flex; gap: 2rem; color: var(--text-secondary); font-size: 0.9rem;">
              <div><i class="fa-solid fa-truck" style="margin-right: 0.5rem; color: var(--primary-color)"></i> Free Shipping</div>
              <div><i class="fa-solid fa-shield-halved" style="margin-right: 0.5rem; color: var(--primary-color)"></i> 1 Year Warranty</div>
            </div>
          </div>
        </div>
      `;

      if (isOutOfStock) return;

      const qtyVal = document.getElementById('detail-qty-val');
      let quantity = 1;

      document.getElementById('qty-minus').addEventListener('click', () => {
        if (quantity > 1) {
          quantity--;
          qtyVal.innerText = quantity;
        }
      });

      document.getElementById('qty-plus').addEventListener('click', () => {
        if (quantity < p.stock) {
          quantity++;
          qtyVal.innerText = quantity;
        } else {
          this.showToast(`Cannot select more. Limit in stock: ${p.stock}`, 'warning');
        }
      });

      document.getElementById('add-to-cart-detail').addEventListener('click', () => {
        this.addProductToCart(p.id, quantity);
      });

    } catch (error) {
      this.appView.innerHTML = `
        <div style="text-align: center; padding: 4rem;">
          <i class="fa-solid fa-circle-exclamation" style="font-size: 3rem; color: var(--error-color); margin-bottom: 1rem;"></i>
          <h3>Product Not Found</h3>
          <p>${error.message}</p>
          <a href="#home" class="auth-btn auth-btn-primary" style="display: inline-block; margin-top: 1.5rem;">Return to Catalog</a>
        </div>
      `;
    }
  }

  renderAuth(mode = 'login') {
    window.authViewMode = mode;
    
    this.appView.innerHTML = `
      <div class="auth-container">
        <div class="auth-header">
          <h2 id="auth-title">${mode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
          <p id="auth-subtitle">${mode === 'login' ? 'Sign in to access your shopping cart and orders' : 'Join Vortex to get premium shopping privileges'}</p>
        </div>

        <form id="auth-form" onsubmit="event.preventDefault();">
          ${mode === 'signup' ? `
            <div class="form-group">
              <label for="auth-name">FULL NAME</label>
              <input type="text" id="auth-name" class="form-input" placeholder="John Doe" required>
            </div>
          ` : ''}
          <div class="form-group">
            <label for="auth-email">EMAIL ADDRESS</label>
            <input type="email" id="auth-email" class="form-input" placeholder="name@domain.com" required>
          </div>
          <div class="form-group">
            <label for="auth-password">PASSWORD</label>
            <input type="password" id="auth-password" class="form-input" placeholder="Min. 6 characters" minlength="6" required>
          </div>
          ${mode === 'signup' ? `
            <div class="form-group">
              <label for="auth-confirm-password">CONFIRM PASSWORD</label>
              <input type="password" id="auth-confirm-password" class="form-input" placeholder="Re-enter password" minlength="6" required>
            </div>
          ` : ''}

          <button type="submit" class="form-btn" id="auth-submit-btn">
            ${mode === 'login' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div class="auth-footer">
          <span id="auth-footer-text">
            ${mode === 'login' ? "Don't have an account?" : "Already have an account?"}
          </span>
          <a href="#auth" id="auth-toggle-link" onclick="window.toggleAuthMode()">
            ${mode === 'login' ? 'Create one now' : 'Sign In instead'}
          </a>
        </div>
      </div>
    `;

    document.getElementById('auth-form').addEventListener('submit', async (e) => {
      const email = document.getElementById('auth-email').value;
      const password = document.getElementById('auth-password').value;
      const btn = document.getElementById('auth-submit-btn');

      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

      try {
        if (window.authViewMode === 'signup') {
          const name = document.getElementById('auth-name').value;
          const confirmPassword = document.getElementById('auth-confirm-password').value;
          if (password !== confirmPassword) {
            throw new Error("Passwords do not match.");
          }
          await window.ecommerceSDK.auth.signup(email, password, name);
          this.showToast('Account created successfully!', 'success');
        } else {
          await window.ecommerceSDK.auth.login(email, password);
          this.showToast('Successfully signed in!', 'success');
        }
        window.location.hash = '#home';
      } catch (error) {
        this.showToast(error.message, 'error');
        btn.disabled = false;
        btn.innerText = window.authViewMode === 'login' ? 'Sign In' : 'Sign Up';
      }
    });
  }

  renderProfile() {
    if (!this.state.currentUser) {
      window.location.hash = '#auth';
      return;
    }

    const u = this.state.currentUser;
    const date = new Date(u.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

    this.appView.innerHTML = `
      <div class="auth-container" style="max-width: 500px; text-align: center;">
        <div style="width: 80px; height: 80px; border-radius: 50%; background: var(--primary-glow); color: var(--primary-color); display: inline-flex; align-items: center; justify-content: center; font-size: 2.5rem; margin-bottom: 1.5rem;">
          <i class="fa-solid fa-user-astronaut"></i>
        </div>
        <h2 style="font-family: var(--font-heading); font-weight: 700; margin-bottom: 0.5rem;">${u.displayName}</h2>
        <p style="color: var(--text-secondary); margin-bottom: 2rem;">${u.email}</p>

        <div style="background: var(--surface-secondary); padding: 1.5rem; border-radius: 12px; text-align: left; margin-bottom: 2rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem;">
            <span style="color: var(--text-secondary); font-size: 0.9rem;">Account ID</span>
            <span style="font-weight: 600; font-family: monospace;">${u.uid}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-secondary); font-size: 0.9rem;">Member Since</span>
            <span style="font-weight: 600;">${date}</span>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          <a href="#orders" class="auth-btn auth-btn-secondary" style="border-radius: 8px; width: 100%; text-align: center; display: block; padding: 0.75rem;">
            <i class="fa-solid fa-receipt" style="margin-right: 0.5rem;"></i> View Order History
          </a>
          <button id="profile-logout-btn" class="auth-btn auth-btn-primary" style="border-radius: 8px; width: 100%; padding: 0.75rem;">
            <i class="fa-solid fa-right-from-bracket" style="margin-right: 0.5rem;"></i> Sign Out
          </button>
        </div>
      </div>
    `;

    document.getElementById('profile-logout-btn').addEventListener('click', async () => {
      await window.ecommerceSDK.auth.logout();
      this.showToast('Successfully logged out', 'success');
      window.location.hash = '#home';
    });
  }

  async renderCheckout() {
    if (!this.state.currentUser) {
      window.location.hash = '#auth';
      return;
    }
    if (this.state.cart.length === 0) {
      this.showToast('Your cart is empty', 'warning');
      window.location.hash = '#home';
      return;
    }

    let summaryItemsHtml = '';
    let total = 0;

    this.state.cart.forEach(item => {
      const p = item.product;
      const sub = p.price * item.quantity;
      total += sub;

      summaryItemsHtml += `
        <div class="summary-item">
          <span class="summary-item-name">${p.name} (x${item.quantity})</span>
          <span style="font-weight: 600;">$${sub.toFixed(2)}</span>
        </div>
      `;
    });

    this.appView.innerHTML = `
      <div style="margin-bottom: 2rem;">
        <h1 class="orders-title">Checkout</h1>
      </div>

      <form id="checkout-form" onsubmit="event.preventDefault();">
        <div class="checkout-grid">
          <!-- Left side fields -->
          <div class="checkout-fields">
            <div class="checkout-section">
              <h2 class="checkout-section-title">Shipping Address</h2>
              
              <div class="form-row">
                <div class="form-group">
                  <label for="ship-first">FIRST NAME</label>
                  <input type="text" id="ship-first" class="form-input" placeholder="John" required>
                </div>
                <div class="form-group">
                  <label for="ship-last">LAST NAME</label>
                  <input type="text" id="ship-last" class="form-input" placeholder="Doe" required>
                </div>
              </div>
              
              <div class="form-group">
                <label for="ship-address">STREET ADDRESS</label>
                <input type="text" id="ship-address" class="form-input" placeholder="123 Main St, Apt 4B" required>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="ship-city">CITY</label>
                  <input type="text" id="ship-city" class="form-input" placeholder="New York" required>
                </div>
                <div class="form-group">
                  <label for="ship-zip">ZIP / POSTAL CODE</label>
                  <input type="text" id="ship-zip" class="form-input" placeholder="10001" required>
                </div>
              </div>

              <div class="form-group">
                <label for="ship-country">COUNTRY</label>
                <select id="ship-country" class="form-input" style="padding: 0.65rem 1rem;" required>
                  <option value="United States">United States</option>
                  <option value="Canada">Canada</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Australia">Australia</option>
                  <option value="India">India</option>
                </select>
              </div>
            </div>

            <div class="checkout-section">
              <h2 class="checkout-section-title">Payment Information</h2>
              
              <div class="form-group">
                <label for="pay-name">CARDHOLDER NAME</label>
                <input type="text" id="pay-name" class="form-input" placeholder="John Doe" required>
              </div>

              <div class="form-group" style="position: relative;">
                <label for="pay-card">CARD NUMBER</label>
                <input type="text" id="pay-card" class="form-input" placeholder="4111 2222 3333 4444" pattern="[0-9 ]{13,19}" required>
                <i class="fa-solid fa-credit-card" style="position: absolute; right: 1rem; bottom: 0.85rem; color: var(--text-secondary);"></i>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="pay-expiry">EXPIRY DATE</label>
                  <input type="text" id="pay-expiry" class="form-input" placeholder="MM/YY" pattern="(0[1-9]|1[0-2])\\/?([0-9]{2})" required>
                </div>
                <div class="form-group">
                  <label for="pay-cvv">CVV</label>
                  <input type="password" id="pay-cvv" class="form-input" placeholder="3 digits" pattern="[0-9]{3}" maxlength="3" required>
                </div>
              </div>
            </div>
          </div>

          <!-- Right side summary -->
          <div class="checkout-summary">
            <div class="summary-card">
              <h2 class="checkout-section-title" style="border-bottom: none; margin-bottom: 1rem; padding-bottom: 0;">Order Summary</h2>
              
              <div class="summary-items">
                ${summaryItemsHtml}
              </div>

              <div class="summary-divider"></div>

              <div class="cart-summary-line">
                <span style="color: var(--text-secondary);">Subtotal</span>
                <span>$${total.toFixed(2)}</span>
              </div>
              <div class="cart-summary-line">
                <span style="color: var(--text-secondary);">Shipping</span>
                <span style="color: var(--success-color); font-weight: 600;">FREE</span>
              </div>
              
              <div class="summary-divider"></div>
              
              <div class="cart-summary-line total" style="margin-bottom: 2rem;">
                <span>Total Amount</span>
                <span>$${total.toFixed(2)}</span>
              </div>

              <button type="submit" class="checkout-btn" id="place-order-btn" style="padding: 1rem;">
                <i class="fa-solid fa-lock" style="margin-right: 0.25rem;"></i> Authorize & Place Order
              </button>
              <p style="font-size: 0.75rem; color: var(--text-secondary); text-align: center; margin-top: 1rem;">
                <i class="fa-solid fa-shield-halved"></i> Secured connection. Your card data is simulated securely.
              </p>
            </div>
          </div>
        </div>
      </form>
    `;

    document.getElementById('checkout-form').addEventListener('submit', async (e) => {
      const placeBtn = document.getElementById('place-order-btn');
      placeBtn.disabled = true;
      placeBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Placing Order...';

      const orderDetails = {
        items: [...this.state.cart],
        totalAmount: total,
        shippingAddress: {
          name: document.getElementById('ship-first').value + ' ' + document.getElementById('ship-last').value,
          address: document.getElementById('ship-address').value,
          city: document.getElementById('ship-city').value,
          zip: document.getElementById('ship-zip').value,
          country: document.getElementById('ship-country').value
        }
      };

      try {
        await window.ecommerceSDK.db.orders.create(this.state.currentUser.uid, orderDetails);
        await window.ecommerceSDK.db.cart.clear(this.state.currentUser.uid);
        this.state.cart = [];
        this.updateCartUI();
        this.showToast('Order placed successfully! Thank you for shopping with Vortex.', 'success');
        window.location.hash = '#orders';
      } catch (error) {
        this.showToast(error.message, 'error');
        placeBtn.disabled = false;
        placeBtn.innerHTML = '<i class="fa-solid fa-lock" style="margin-right: 0.25rem;"></i> Authorize & Place Order';
      }
    });
  }

  async renderOrders() {
    if (!this.state.currentUser) {
      window.location.hash = '#auth';
      return;
    }

    this.appView.innerHTML = '<div class="spinner"></div>';

    try {
      const orders = await window.ecommerceSDK.db.orders.getByUser(this.state.currentUser.uid);
      
      if (orders.length === 0) {
        this.appView.innerHTML = `
          <div class="orders-empty">
            <i class="fa-solid fa-receipt"></i>
            <h2>No orders found</h2>
            <p>You haven't placed any orders yet. Once you make a purchase, it will appear here.</p>
            <a href="#home" class="auth-btn auth-btn-primary">Browse Catalog</a>
          </div>
        `;
        return;
      }

      let ordersHtml = '';
      orders.forEach(order => {
        const orderDate = new Date(order.createdAt).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        let itemsGridHtml = '';
        order.items.forEach(item => {
          itemsGridHtml += `
            <div class="order-item-detail">
              <img src="${item.product.image}" alt="${item.product.name}" class="order-item-img">
              <div class="order-item-desc">
                <div class="order-item-name">${item.product.name}</div>
                <div class="order-item-qty">Qty: ${item.quantity} &times; $${item.product.price.toFixed(2)}</div>
              </div>
              <div class="order-item-total">$${(item.product.price * item.quantity).toFixed(2)}</div>
            </div>
          `;
        });

        ordersHtml += `
          <div class="order-card">
            <div class="order-card-header">
              <div class="order-meta-group">
                <div class="order-meta-item">
                  <span class="order-meta-label">ORDER ID</span>
                  <span class="order-meta-val" style="font-family: monospace;">#${order.id}</span>
                </div>
                <div class="order-meta-item">
                  <span class="order-meta-label">DATE PLACED</span>
                  <span class="order-meta-val">${orderDate}</span>
                </div>
                <div class="order-meta-item">
                  <span class="order-meta-label">TOTAL PAID</span>
                  <span class="order-meta-val" style="color: var(--primary-color); font-weight: 700;">$${order.totalAmount.toFixed(2)}</span>
                </div>
              </div>
              <div>
                <span class="order-status-badge status-processing">${order.status}</span>
              </div>
            </div>
            <div class="order-card-body">
              <div class="order-items-grid">
                ${itemsGridHtml}
              </div>
              <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; font-size: 0.9rem; color: var(--text-secondary);">
                <div>
                  <i class="fa-solid fa-map-pin" style="color: var(--primary-color)"></i> Shipping to: <strong>${order.shippingAddress.name}</strong>, ${order.shippingAddress.address}, ${order.shippingAddress.city}, ${order.shippingAddress.zip}, ${order.shippingAddress.country}
                </div>
                <div>
                  Expected Delivery: <strong>3-5 Business Days</strong>
                </div>
              </div>
            </div>
          </div>
        `;
      });

      this.appView.innerHTML = `
        <h1 class="orders-title">Your Order History</h1>
        <div class="orders-list">
          ${ordersHtml}
        </div>
      `;

    } catch (error) {
      this.appView.innerHTML = `<div style="color: var(--error-color); text-align: center; padding: 2rem;">Error loading orders: ${error.message}</div>`;
    }
  }
}

// Global helpers that are triggered from inline onClick functions
window.toggleAuthMode = () => {
  const currentMode = window.authViewMode || 'login';
  const newMode = currentMode === 'login' ? 'signup' : 'login';
  window.app.renderAuth(newMode);
};

window.setAuthViewMode = (mode) => {
  window.location.hash = '#auth';
  // Small timeout to allow DOM to render then shift mode if needed
  setTimeout(() => {
    window.app.renderAuth(mode);
  }, 50);
};

window.setCategory = (category) => {
  window.app.state.activeCategory = category;
  const tabs = document.querySelectorAll('.category-tab');
  tabs.forEach(tab => {
    if (tab.dataset.category === category) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
  window.location.hash = '#home';
};

// Initialize App on DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new VortexApp();
});
