/* ─── FraudShield · ShopEase Main Application Logic ─── */

let state = {
  currentRole: 'Customer', // 'Customer' or 'Seller'
  isLoggedIn: false,
  currentUser: null,
  biometrics: {
    faceCaptured: false,
    faceDataUrl: null,
    fingerprintVerified: false
  },
  videoStream: null,
  chartInstances: {}
};

let registeredUsers = {};

// ─── INITIALIZATION ───
document.addEventListener('DOMContentLoaded', () => {
  detectIpAddress();
  initRiskScoreCalculator();
});

// ─── IP DETECTION ───
function detectIpAddress() {
  const ipElement = document.getElementById('ipAddress');
  if (!ipElement) return;
  // Simulate quick detection or fetch public IP
  setTimeout(() => {
    const mockIPs = ['103.240.198.42', '49.37.142.91', '157.48.210.15', '182.72.102.66'];
    const randomIp = mockIPs[Math.floor(Math.random() * mockIPs.length)];
    ipElement.innerHTML = `${randomIp} <span style="font-size:0.75rem; color:#2a9d8f;">(TLS 1.3 Encrypted)</span>`;
  }, 400);
}

// ─── ROLE & MODAL MANAGEMENT ───
function openRegister(role) {
  state.currentRole = role;
  state.biometrics.faceCaptured = false;
  state.biometrics.fingerprintVerified = false;

  const title = document.getElementById('modalRoleTitle');
  const badge = document.getElementById('roleBadge');
  const addressGroup = document.getElementById('addressGroup');
  const faceBtn = document.getElementById('faceBtn');
  const fingerBtn = document.getElementById('fingerBtn');
  const bioStatus = document.getElementById('bioStatus');
  
  if (title) title.innerText = role;
  if (badge) badge.innerText = `${role} Registration`;
  if (addressGroup) {
    if (role === 'Customer') {
      addressGroup.classList.add('visible');
    } else {
      addressGroup.classList.remove('visible');
    }
  }

  if (faceBtn) {
    faceBtn.className = 'bio-btn face';
    faceBtn.innerHTML = `<i class="fas fa-camera"></i> Face ID`;
  }
  if (fingerBtn) {
    fingerBtn.className = 'bio-btn finger';
    fingerBtn.innerHTML = `<i class="fas fa-fingerprint"></i> Fingerprint`;
  }
  if (bioStatus) {
    bioStatus.innerHTML = `<i class="fas fa-info-circle"></i><span class="status-msg">Awaiting biometric capture</span>`;
  }

  document.getElementById('registerOverlay').classList.add('active');
}

function closeRegister() {
  document.getElementById('registerOverlay').classList.remove('active');
}

function openLogin(alertMsg = null) {
  const container = document.getElementById('loginAlertContainer');
  if (container) {
    if (alertMsg) {
      container.innerHTML = `<div class="auth-alert success"><i class="fas fa-check-circle"></i> ${alertMsg}</div>`;
    } else {
      container.innerHTML = '';
    }
  }
  document.getElementById('loginOverlay').classList.add('active');
}

function openLoginForRole(role) {
  setLoginRole(role);
  openLogin();
}

function closeLogin() {
  document.getElementById('loginOverlay').classList.remove('active');
  const container = document.getElementById('loginAlertContainer');
  if (container) container.innerHTML = '';
}

function switchToLogin() {
  closeRegister();
  openLogin();
}

function switchToRegister() {
  closeLogin();
  openRegister(state.currentRole || 'Customer');
}

function setLoginRole(role) {
  state.currentRole = role;
  const custBtn = document.getElementById('loginCustomerBtn');
  const sellBtn = document.getElementById('loginSellerBtn');

  if (role === 'Customer') {
    custBtn.className = 'active customer-active';
    sellBtn.className = '';
  } else {
    sellBtn.className = 'active seller-active';
    custBtn.className = '';
  }
}

// ─── BIOMETRIC VERIFICATION (FACE CAPTURE & FINGERPRINT) ───

// 1. Face Capture Camera Flow
async function startFaceCapture() {
  const overlay = document.getElementById('cameraOverlay');
  const video = document.getElementById('video');
  const hint = document.getElementById('camHint');
  const preview = document.getElementById('camPreview');
  const camActions = document.getElementById('camActions');

  preview.style.display = 'none';
  camActions.style.display = 'flex';
  hint.innerText = 'Position your face in the frame and click Capture';
  overlay.classList.add('active');

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
    state.videoStream = stream;
    video.srcObject = stream;
  } catch (err) {
    console.warn('Webcam permission error or missing device:', err);
    showPermissionError();
  }
}

function captureFace() {
  const video = document.getElementById('video');
  const preview = document.getElementById('camPreview');
  const capturedImg = document.getElementById('capturedImage');
  const camActions = document.getElementById('camActions');
  const hint = document.getElementById('camHint');

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 400;
  canvas.height = video.videoHeight || 300;
  const ctx = canvas.getContext('2d');

  if (state.videoStream && video.readyState === 4) {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    state.biometrics.faceDataUrl = canvas.toDataURL('image/png');
  } else {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(canvas.width/2, canvas.height/2 - 20, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(canvas.width/2, canvas.height/2 + 80, 80, 0, Math.PI, true);
    ctx.fill();
    state.biometrics.faceDataUrl = canvas.toDataURL('image/png');
  }

  capturedImg.src = state.biometrics.faceDataUrl;
  preview.style.display = 'block';
  camActions.style.display = 'none';
  hint.innerText = 'Verify your snapshot before confirming';
}

function confirmFace() {
  state.biometrics.faceCaptured = true;
  closeCamera();

  const faceBtn = document.getElementById('faceBtn');
  const bioStatus = document.getElementById('bioStatus');

  if (faceBtn) {
    faceBtn.classList.add('verified');
    faceBtn.innerHTML = `<i class="fas fa-check-circle"></i> Face Verified`;
  }

  if (bioStatus) {
    bioStatus.innerHTML = `<i class="fas fa-check-circle" style="color:#2a9d8f;"></i> <span class="status-msg success">Face ID capture successful</span>`;
  }
}

function retryCapture() {
  const preview = document.getElementById('camPreview');
  const camActions = document.getElementById('camActions');
  const hint = document.getElementById('camHint');

  preview.style.display = 'none';
  camActions.style.display = 'flex';
  hint.innerText = 'Position your face in the frame and click Capture';
}

function closeCamera() {
  if (state.videoStream) {
    state.videoStream.getTracks().forEach(track => track.stop());
    state.videoStream = null;
  }
  document.getElementById('cameraOverlay').classList.remove('active');
}

function showPermissionError() {
  closeCamera();
  document.getElementById('permissionError').classList.add('active');
}

function closePermissionError() {
  document.getElementById('permissionError').classList.remove('active');
}

function retryCameraAccess() {
  closePermissionError();
  setTimeout(() => {
    simulateFallbackFaceScan();
  }, 300);
}

function simulateFallbackFaceScan() {
  state.biometrics.faceCaptured = true;
  const faceBtn = document.getElementById('faceBtn');
  const bioStatus = document.getElementById('bioStatus');

  if (faceBtn) {
    faceBtn.classList.add('verified');
    faceBtn.innerHTML = `<i class="fas fa-check-circle"></i> Face Verified (Simulated)`;
  }

  if (bioStatus) {
    bioStatus.innerHTML = `<i class="fas fa-check-circle" style="color:#2a9d8f;"></i> <span class="status-msg success">Face verification passed</span>`;
  }
}

// 2. Fingerprint Scan & Photo Upload Flow
let fingerPlaced = false;

function startFingerprintScan() {
  fingerPlaced = false;
  const overlay = document.getElementById('fingerprintOverlay');
  const previewArea = document.getElementById('thumbPreviewArea');
  const displayArea = document.getElementById('thumbImgDisplayArea');
  const fileInput = document.getElementById('thumbFileInput');

  if (previewArea) previewArea.style.display = 'block';
  if (displayArea) displayArea.style.display = 'none';
  if (fileInput) fileInput.value = '';

  switchFingerprintMode('upload');

  if (overlay) overlay.classList.add('active');
}

function switchFingerprintMode(mode) {
  const uploadContainer = document.getElementById('thumbUploadContainer');
  const touchContainer = document.getElementById('thumbTouchContainer');
  const uploadBtn = document.getElementById('thumbUploadModeBtn');
  const touchBtn = document.getElementById('thumbTouchModeBtn');
  const status = document.getElementById('fingerprintStatus');
  const actionBtn = document.getElementById('fingerScanBtn');

  if (mode === 'upload') {
    if (uploadContainer) uploadContainer.style.display = 'block';
    if (touchContainer) touchContainer.style.display = 'none';
    if (uploadBtn) {
      uploadBtn.style.background = '#ffffff';
      uploadBtn.style.color = '#0f172a';
      uploadBtn.style.fontWeight = '700';
    }
    if (touchBtn) {
      touchBtn.style.background = 'transparent';
      touchBtn.style.color = '#64748b';
      touchBtn.style.fontWeight = '600';
    }
    if (status) status.innerText = '📁 Select & upload your thumb fingerprint picture to scan';
    if (actionBtn) {
      actionBtn.style.display = 'inline-flex';
      actionBtn.innerHTML = `<i class="fas fa-file-upload"></i> Browse Thumb Picture`;
      actionBtn.onclick = triggerThumbUploadClick;
    }
  } else {
    if (uploadContainer) uploadContainer.style.display = 'none';
    if (touchContainer) touchContainer.style.display = 'block';
    if (touchBtn) {
      touchBtn.style.background = '#ffffff';
      touchBtn.style.color = '#0f172a';
      touchBtn.style.fontWeight = '700';
    }
    if (uploadBtn) {
      uploadBtn.style.background = 'transparent';
      uploadBtn.style.color = '#64748b';
      uploadBtn.style.fontWeight = '600';
    }
    if (status) status.innerText = '👆 Touch sensor pad or click button below to place finger';
    if (actionBtn) {
      actionBtn.style.display = 'inline-flex';
      actionBtn.innerHTML = `<i class="fas fa-hand-pointer"></i> Touch & Place Finger`;
      actionBtn.onclick = placeFingerOnSensor;
    }
  }
}

function triggerThumbUploadClick() {
  const input = document.getElementById('thumbFileInput');
  if (input) input.click();
}

function handleThumbDrop(event) {
  event.preventDefault();
  if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
    const file = event.dataTransfer.files[0];
    processThumbImageFile(file);
  }
}

function handleThumbPhotoUpload(event) {
  const file = event.target.files ? event.target.files[0] : null;
  if (file) {
    processThumbImageFile(file);
  }
}

function processThumbImageFile(file) {
  if (!file.type.startsWith('image/')) {
    alert('Please upload a valid image file (.png, .jpg, .jpeg) of your thumb print.');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    state.biometrics.thumbDataUrl = dataUrl;

    const previewArea = document.getElementById('thumbPreviewArea');
    const displayArea = document.getElementById('thumbImgDisplayArea');
    const img = document.getElementById('thumbUploadedImg');
    const laser = document.getElementById('thumbLaserScanLine');
    const status = document.getElementById('fingerprintStatus');
    const actionBtn = document.getElementById('fingerScanBtn');

    if (previewArea) previewArea.style.display = 'none';
    if (displayArea) displayArea.style.display = 'block';
    if (img) img.src = dataUrl;
    if (laser) laser.style.display = 'block';
    if (actionBtn) actionBtn.style.display = 'none';

    if (status) {
      status.innerHTML = `<span style="color:#0284c7;"><i class="fas fa-spinner fa-spin"></i> Scanning uploaded thumb picture pattern &amp; minutiae...</span>`;
    }

    // Auto Scan Animation & Pattern Verification
    setTimeout(() => {
      if (laser) laser.style.display = 'none';
      if (status) {
        status.innerHTML = `<span style="color:#10b981; font-weight:700;"><i class="fas fa-check-circle"></i> Thumb Fingerprint Pattern Verified! Identity token generated.</span>`;
      }
      state.biometrics.fingerprintVerified = true;

      setTimeout(() => {
        closeFingerprint();
        const fingerBtn = document.getElementById('fingerBtn');
        const bioStatus = document.getElementById('bioStatus');

        if (fingerBtn) {
          fingerBtn.classList.add('verified');
          fingerBtn.innerHTML = `<i class="fas fa-check-circle"></i> Thumb Photo Verified`;
        }

        if (bioStatus) {
          bioStatus.innerHTML = `<i class="fas fa-check-circle" style="color:#2a9d8f;"></i> <span class="status-msg success">Biometric thumb photo scan verified</span>`;
        }
      }, 1200);
    }, 2000);
  };
  reader.readAsDataURL(file);
}

function placeFingerOnSensor() {
  if (fingerPlaced) return;
  fingerPlaced = true;

  const scanner = document.getElementById('fingerprintScanner');
  const status = document.getElementById('fingerprintStatus');
  const btn = document.getElementById('fingerScanBtn');

  if (scanner) scanner.className = 'fingerprint-scanner scanning';
  if (status) status.innerHTML = '⚡ Finger detected on sensor! Scanning fingerprint pattern...';
  if (btn) btn.style.display = 'none';

  setTimeout(() => {
    if (scanner) scanner.className = 'fingerprint-scanner success';
    if (status) status.innerHTML = '✓ Fingerprint matched &amp; verified! Security Token Generated.';
    state.biometrics.fingerprintVerified = true;

    setTimeout(() => {
      closeFingerprint();
      const fingerBtn = document.getElementById('fingerBtn');
      const bioStatus = document.getElementById('bioStatus');

      if (fingerBtn) {
        fingerBtn.classList.add('verified');
        fingerBtn.innerHTML = `<i class="fas fa-check-circle"></i> Fingerprint Verified`;
      }

      if (bioStatus) {
        bioStatus.innerHTML = `<i class="fas fa-check-circle" style="color:#2a9d8f;"></i> <span class="status-msg success">Biometric fingerprint identity verified</span>`;
      }
    }, 1200);
  }, 1800);
}

function simulateFingerprintScan() {
  placeFingerOnSensor();
}

function closeFingerprint() {
  const overlay = document.getElementById('fingerprintOverlay');
  if (overlay) overlay.classList.remove('active');

  if (!state.biometrics.fingerprintVerified) {
    const fingerBtn = document.getElementById('fingerBtn');
    if (fingerBtn && !fingerBtn.classList.contains('verified')) {
      fingerBtn.className = 'bio-btn finger';
      fingerBtn.innerHTML = `<i class="fas fa-fingerprint"></i> Fingerprint`;
    }
  }
}

// ─── AUTH FORM SUBMIT ───
function submitRegistration(event) {
  event.preventDefault();
  const name = document.getElementById('fullName').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  // 1. Full Name Validation: Required, letters/spaces only, reasonable length (2 to 50 characters)
  const nameRegex = /^[A-Za-z\s]+$/;
  if (!name) {
    alert('Full Name is required.');
    return;
  }
  if (!nameRegex.test(name) || name.length < 2 || name.length > 50) {
    alert('Full Name must contain letters and spaces only, and be between 2 and 50 characters in length.');
    return;
  }

  // 2. Email Validation: Required, valid email format, should not already exist
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    alert('Email Address is required.');
    return;
  }
  if (!emailRegex.test(email)) {
    alert('Please enter a valid email address (e.g. user@example.com).');
    return;
  }
  if (registeredUsers[email.toLowerCase()]) {
    alert('An account with this email address already exists. Please log in instead.');
    return;
  }

  // 3. Password Validation: Required, minimum 8 characters, uppercase + lowercase + number + special character
  if (!password) {
    alert('Password is required.');
    return;
  }
  if (password.length < 8) {
    alert('Password must be at least 8 characters long.');
    return;
  }
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

  if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecialChar) {
    alert('Password must include at least one uppercase letter, one lowercase letter, one number, and one special character (e.g. @, #, $, !).');
    return;
  }

  if (!state.biometrics.faceCaptured && !state.biometrics.fingerprintVerified) {
    const bioStatus = document.getElementById('bioStatus');
    if (bioStatus) {
      bioStatus.innerHTML = `<i class="fas fa-exclamation-triangle" style="color:#db6e7a;"></i> <span class="status-msg warning">Please complete at least one biometric verification (Face ID or Fingerprint) to register your account securely.</span>`;
    }
    return;
  }

  // Save registered user details
  registeredUsers[email.toLowerCase()] = {
    name,
    email,
    password,
    role: state.currentRole,
    biometrics: { ...state.biometrics }
  };

  closeRegister();

  // Reset registration form & biometric buttons
  document.getElementById('registerForm').reset();
  state.biometrics.faceCaptured = false;
  state.biometrics.fingerprintVerified = false;
  
  const faceBtn = document.getElementById('faceBtn');
  const fingerBtn = document.getElementById('fingerBtn');
  const bioStatus = document.getElementById('bioStatus');
  
  if (faceBtn) {
    faceBtn.className = 'bio-btn face';
    faceBtn.innerHTML = `<i class="fas fa-camera"></i> Face ID`;
  }
  if (fingerBtn) {
    fingerBtn.className = 'bio-btn finger';
    fingerBtn.innerHTML = `<i class="fas fa-fingerprint"></i> Fingerprint`;
  }
  if (bioStatus) {
    bioStatus.innerHTML = `<i class="fas fa-info-circle"></i><span class="status-msg">Awaiting biometric capture</span>`;
  }

  // Pre-fill login email & select registered role
  setLoginRole(state.currentRole);
  const loginEmailInput = document.getElementById('loginEmail');
  if (loginEmailInput) {
    loginEmailInput.value = email;
  }

  // Open Login modal with registration success banner
  openLogin(`Registration successful for <strong>${name}</strong> (${state.currentRole})! Please enter your password below to log in.`);
}

function formatNameFromEmail(email) {
  if (!email) return 'Priya Sharma';
  const namePart = email.split('@')[0];
  const parts = namePart.split(/[\._\-]/);
  const formatted = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
  return formatted || 'Priya Sharma';
}

function loginWithGoogle() {
  const userRole = state.currentRole || 'Seller';
  const sampleGmail = prompt(`Enter your Gmail address to sign in as ${userRole}:`, `niveditha@gmail.com`);
  
  if (!sampleGmail || !sampleGmail.trim()) return;

  const email = sampleGmail.trim().toLowerCase();
  const displayName = formatNameFromEmail(email);

  state.currentUser = { name: displayName, email, role: userRole };
  state.isLoggedIn = true;

  closeLogin();
  closeRegister();
  launchDashboard(userRole, displayName);
  showToastNotification(`✓ Signed in successfully with Gmail (${email}) as ${userRole}!`);
}

function updateSellerNameFromInput(newName) {
  const name = newName.trim();
  if (!name) return;
  if (state.currentUser) {
    state.currentUser.name = name;
  }
  
  // Sync everywhere in Seller and Customer sections
  const sellerNameEl = document.getElementById('sellerName');
  if (sellerNameEl) sellerNameEl.innerText = name;

  const sellerNameElements = document.querySelectorAll('.seller-user-name-display');
  sellerNameElements.forEach(el => {
    el.innerText = name;
  });

  const custNameElements = document.querySelectorAll('.cust-user-name-display');
  custNameElements.forEach(el => {
    el.innerText = name;
  });

  updateAvatarInitials(name);
}

function updateAvatarInitials(userName) {
  if (!userName) return;
  const parts = userName.trim().split(/\s+/);
  let initials = 'PS';
  if (parts.length === 1) {
    initials = parts[0].substring(0, 2).toUpperCase();
  } else if (parts.length > 1) {
    initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  const avatars = document.querySelectorAll('.msg-avatar-user');
  avatars.forEach(el => {
    el.innerText = initials;
  });
}

function submitLogin(event) {
  event.preventDefault();
  const emailInput = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  // 1. Email/Username Validation: Required, valid format if email is used
  if (!emailInput) {
    alert('Email / Username is required.');
    return;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailInput.includes('@') && !emailRegex.test(emailInput)) {
    alert('Please enter a valid email format for your login ID.');
    return;
  }

  // 2. Password Validation: Required
  if (!password) {
    alert('Password is required.');
    return;
  }

  const email = emailInput.toLowerCase();
  const existingUser = registeredUsers[email];
  let displayName = existingUser ? existingUser.name : formatNameFromEmail(email);
  let userRole = existingUser ? existingUser.role : state.currentRole;

  state.currentUser = { name: displayName, email, role: userRole };
  state.isLoggedIn = true;

  closeLogin();
  launchDashboard(userRole, displayName);
}

function launchDashboard(role, userName) {
  document.getElementById('mainCard').style.display = 'none';

  if (!userName || userName === 'Customer' || userName === 'Seller') {
    userName = state.currentUser ? state.currentUser.name : 'Priya Sharma';
  }

  // Ensure state.currentUser has the current user details
  if (!state.currentUser) {
    state.currentUser = { name: userName, email: 'user@gmail.com', role: role };
  } else {
    state.currentUser.name = userName;
    state.currentUser.role = role;
  }

  // Sync Topbars
  const custNameEl = document.getElementById('custName');
  if (custNameEl) custNameEl.innerText = userName;

  const sellerNameEl = document.getElementById('sellerName');
  if (sellerNameEl) sellerNameEl.innerText = userName;

  // Sync all dynamic seller name spans in Seller Section
  const sellerNameElements = document.querySelectorAll('.seller-user-name-display');
  sellerNameElements.forEach(el => {
    el.innerText = userName;
  });

  // Sync all dynamic customer name spans in Customer Section & Tables
  const custNameElements = document.querySelectorAll('.cust-user-name-display');
  custNameElements.forEach(el => {
    el.innerText = userName;
  });

  // Sync cardholder names on saved payment cards & input fields
  const cardHolders = document.querySelectorAll('.card-holder-val');
  cardHolders.forEach(el => {
    const val = el.innerText.trim();
    if (val !== '08/28' && val !== '11/27' && val !== '04/29' && val !== '02/26') {
      el.innerText = userName;
    }
  });

  const inlineCardHolder = document.getElementById('inlineCardHolder');
  if (inlineCardHolder) inlineCardHolder.value = userName;
  const newCardHolder = document.getElementById('newCardHolder');
  if (newCardHolder) newCardHolder.value = userName;

  // Update seller profile inputs in Store Settings if present
  const sellerProfileNameInput = document.getElementById('sellerProfileNameInput');
  if (sellerProfileNameInput) sellerProfileNameInput.value = userName;
  const sellerProfileEmailInput = document.getElementById('sellerProfileEmailInput');
  if (sellerProfileEmailInput && state.currentUser && state.currentUser.email) {
    sellerProfileEmailInput.value = state.currentUser.email;
  }

  // Update initials for message avatars
  updateAvatarInitials(userName);

  // Clear active state from both dashboard views first
  const sellerDash = document.getElementById('dashboardSeller');
  const custDash = document.getElementById('dashboardCustomer');
  if (sellerDash) sellerDash.classList.remove('active');
  if (custDash) custDash.classList.remove('active');

  // Direct role redirection
  if (role === 'Seller') {
    if (sellerDash) {
      sellerDash.classList.add('active');
      switchSellerSection('dashboard', document.querySelector('#sellerNavList li[data-section="dashboard"]'));
    }
  } else {
    if (custDash) {
      custDash.classList.add('active');
      switchCustomerSection('overview', document.querySelector('#custNavList li[data-section="overview"]'));
    }
  }

  setTimeout(() => {
    initFraudAnalyticsCharts();
  }, 200);
}

// ─── SECTION SWITCHING ───
function switchSellerSection(sectionId, navElement) {
  const navItems = document.querySelectorAll('#sellerNavList .img-nav-item');
  navItems.forEach(item => item.classList.remove('active'));
  if (navElement) navElement.classList.add('active');

  const sections = document.querySelectorAll('.dashboard-seller .dashboard-section');
  sections.forEach(sec => sec.classList.remove('active-section'));

  const target = document.getElementById(`section-${sectionId}`);
  if (target) {
    target.classList.add('active-section');
  }

  // Single unified search bar placeholder per section in seller dashboard
  const searchInput = document.getElementById('sellerGlobalSearchInput');
  if (searchInput) {
    searchInput.value = '';
    filterSellerGlobalSearch('');
    const placeholders = {
      dashboard: '🔍 Search orders, products, risk matrix, reviews...',
      orders: '🔍 Search Orders by ID, Customer Name, Product, or Status...',
      products: '🔍 Search Products catalog by ID, Name, Category, Price, Stock...',
      analytics: '🔍 Search Fraud Analytics and EDA distribution charts...',
      'risk-detector': '🔍 Search Risk Score Matrix parameters...',
      payouts: '🔍 Search Payouts, balances, and settlements...',
      returns: '🔍 Search Return claims, reasons, or risk level...',
      reviews: '🔍 Search Verified Customer Reviews and Ratings...',
      messages: '🔍 Search Customer Inquiry Messages...',
      'store-settings': '🔍 Search Store Profile & Security Settings...'
    };
    searchInput.placeholder = placeholders[sectionId] || '🔍 Search...';
  }

  if (sectionId === 'analytics') {
    setTimeout(() => initFraudAnalyticsCharts(), 100);
  }
}

function switchCustomerSection(sectionId, navElement) {
  const navItems = document.querySelectorAll('#custNavList .cust-nav-item');
  navItems.forEach(item => item.classList.remove('active'));
  if (navElement) navElement.classList.add('active');

  const sections = document.querySelectorAll('.dashboard-customer .cust-section');
  sections.forEach(sec => sec.classList.remove('active'));

  const target = document.getElementById(`cust-section-${sectionId}`);
  if (target) {
    target.classList.add('active');
  }

  // Single unified customer search bar placeholder per section
  const searchInput = document.getElementById('custGlobalSearchInput');
  if (searchInput) {
    searchInput.value = '';
    filterCustomerGlobalSearch('');
    const placeholders = {
      overview: '🔍 Search orders, tracking, wishlist items, saved cards...',
      orders: '🔍 Search My Purchase Orders by Order ID, item, or status...',
      tracking: '🔍 Search Package Tracking by Tracking ID, carrier, or location...',
      wishlist: '🔍 Search Wishlist items by product name, category, or price...',
      analytics: '🔍 Search Fraud Statistics and Security Insights...',
      wallet: '🔍 Search Saved Payment Cards by bank name or card type...'
    };
    searchInput.placeholder = placeholders[sectionId] || '🔍 Search...';
  }

  if (sectionId === 'analytics') {
    setTimeout(() => initFraudAnalyticsCharts(), 100);
  }
}

// ─── LOGOUT FLOW ───
function openLogoutFloat() {
  document.getElementById('logoutFloat').classList.add('active');
}

function closeLogoutFloat() {
  document.getElementById('logoutFloat').classList.remove('active');
}

function confirmLogout() {
  closeLogoutFloat();
  state.isLoggedIn = false;
  state.currentUser = null;

  document.getElementById('dashboardSeller').classList.remove('active');
  document.getElementById('dashboardCustomer').classList.remove('active');
  document.getElementById('mainCard').style.display = 'block';
}

// ─── FRAUD ANALYTICS CHARTS (EXACT MATCH FOR USER EDA SCREENSHOT) ───
function initFraudAnalyticsCharts() {
  if (typeof Chart === 'undefined') return;

  // Chart 1: Fraud Rate by Region
  createOrUpdateChart('chartRegion', {
    type: 'bar',
    data: {
      labels: ['North', 'East', 'Unknown', 'West', 'South'],
      datasets: [{
        label: 'Fraud Rate',
        data: [0.36, 0.36, 0.358, 0.29, 0.285],
        backgroundColor: '#7dd3fc',
        borderColor: '#38bdf8',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, max: 0.4, title: { display: true, text: 'Fraud Rate', font: { size: 11 } } },
        x: { title: { display: true, text: 'Region', font: { size: 11 } } }
      }
    }
  });

  // Chart 2: Fraud Rate by Card Type
  createOrUpdateChart('chartCardType', {
    type: 'bar',
    data: {
      labels: ['RuPay', 'MasterCard', 'Visa', 'Unknown'],
      datasets: [{
        label: 'Fraud Rate',
        data: [0.34, 0.318, 0.30, 0.245],
        backgroundColor: '#fca5a5',
        borderColor: '#f87171',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, max: 0.4, title: { display: true, text: 'Fraud Rate', font: { size: 11 } } },
        x: { title: { display: true, text: 'Card Type', font: { size: 11 } } }
      }
    }
  });

  // Customer view card type chart
  createOrUpdateChart('custChartCardType', {
    type: 'bar',
    data: {
      labels: ['RuPay', 'MasterCard', 'Visa', 'Unknown'],
      datasets: [{
        label: 'Fraud Rate',
        data: [0.34, 0.318, 0.30, 0.245],
        backgroundColor: '#fca5a5',
        borderColor: '#f87171',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, max: 0.4, title: { display: true, text: 'Fraud Rate', font: { size: 11 } } },
        x: { title: { display: true, text: 'Card Type', font: { size: 11 } } }
      }
    }
  });

  // Chart 3: Fraud Rate by Age Group
  createOrUpdateChart('chartAgeGroup', {
    type: 'bar',
    data: {
      labels: ['Elderly', 'Senior', 'Young', 'Adult'],
      datasets: [{
        label: 'Fraud Rate',
        data: [0.336, 0.313, 0.309, 0.302],
        backgroundColor: '#86efac',
        borderColor: '#4ade80',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, max: 0.4, title: { display: true, text: 'Fraud Rate', font: { size: 11 } } },
        x: { title: { display: true, text: 'Age Group', font: { size: 11 } } }
      }
    }
  });

  // Chart 4: Transaction Amount Distribution (Legitimate vs Fraud)
  createOrUpdateChart('chartAmountDist', {
    type: 'bar',
    data: {
      labels: ['0-2k', '2k-4k', '4k-6k', '6k-8k', '8k-10k', '10k-12k', '12k-15k', '15k-20k'],
      datasets: [
        {
          label: 'Legitimate',
          data: [150, 195, 510, 160, 150, 100, 60, 20],
          backgroundColor: 'rgba(56, 189, 248, 0.5)',
          borderColor: '#0284c7',
          borderWidth: 1
        },
        {
          label: 'Fraud',
          data: [80, 60, 290, 70, 50, 30, 15, 5],
          backgroundColor: 'rgba(251, 146, 60, 0.7)',
          borderColor: '#ea580c',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true, position: 'top' } },
      scales: {
        y: { beginAtZero: true, max: 550, title: { display: true, text: 'Frequency', font: { size: 11 } } },
        x: { title: { display: true, text: 'Amount (₹)', font: { size: 11 } } }
      }
    }
  });

  // Chart 5: Fraud Count by Hour
  const hourLabels = Array.from({ length: 24 }, (_, i) => `${i}.0`);
  const hourCounts = [110, 86, 98, 67, 102, 154, 66, 97, 76, 110, 120, 122, 90, 52, 121, 39, 76, 71, 82, 114, 60, 50, 78, 86];

  createOrUpdateChart('chartHourCount', {
    type: 'bar',
    data: {
      labels: hourLabels,
      datasets: [{
        label: 'Fraud Count',
        data: hourCounts,
        backgroundColor: '#fbbf24',
        borderColor: '#f59e0b',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, max: 170, title: { display: true, text: 'Fraud Count', font: { size: 11 } } },
        x: { title: { display: true, text: 'Hour of Day', font: { size: 10 } }, ticks: { font: { size: 9 } } }
      }
    }
  });

  // Chart 6: Top Fraud Types
  createOrUpdateChart('chartFraudTypes', {
    type: 'bar',
    data: {
      labels: ['Payment card fraud', 'Identity theft', 'Scam', 'Malware', 'Phishing', 'Unknown'],
      datasets: [{
        label: 'Count',
        data: [480, 442, 430, 390, 388, 135],
        backgroundColor: '#9333ea',
        borderColor: '#7e22ce',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, max: 500, title: { display: true, text: 'Count', font: { size: 11 } } },
        x: { title: { display: true, text: 'Fraud Type', font: { size: 10 } }, ticks: { font: { size: 9 } } }
      }
    }
  });

  createOrUpdateChart('custChartFraudTypes', {
    type: 'bar',
    data: {
      labels: ['Payment card fraud', 'Identity theft', 'Scam', 'Malware', 'Phishing', 'Unknown'],
      datasets: [{
        label: 'Count',
        data: [480, 442, 430, 390, 388, 135],
        backgroundColor: '#9333ea',
        borderColor: '#7e22ce',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, max: 500, title: { display: true, text: 'Count', font: { size: 11 } } },
        x: { title: { display: true, text: 'Fraud Type', font: { size: 10 } }, ticks: { font: { size: 9 } } }
      }
    }
  });
}

function createOrUpdateChart(canvasId, config) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (state.chartInstances[canvasId]) {
    state.chartInstances[canvasId].destroy();
  }

  state.chartInstances[canvasId] = new Chart(canvas, config);
}

// ─── INTERACTIVE FRAUD RISK CALCULATOR TOOL ───
function initRiskScoreCalculator() {
  const amountInput = document.getElementById('riskAmount');
  const cardSelect = document.getElementById('riskCardType');
  const hourInput = document.getElementById('riskHour');
  const regionSelect = document.getElementById('riskRegion');
  const ageSelect = document.getElementById('riskAge');

  if (!amountInput) return;

  const inputs = [amountInput, cardSelect, hourInput, regionSelect, ageSelect];
  inputs.forEach(input => {
    if (input) {
      input.addEventListener('change', calculateFraudRisk);
      input.addEventListener('input', calculateFraudRisk);
    }
  });

  calculateFraudRisk();
}

function calculateFraudRisk() {
  const amount = parseFloat(document.getElementById('riskAmount')?.value || 5000);
  const cardType = document.getElementById('riskCardType')?.value || 'RuPay';
  const hour = parseInt(document.getElementById('riskHour')?.value || 5);
  const region = document.getElementById('riskRegion')?.value || 'North';
  const age = document.getElementById('riskAge')?.value || 'Elderly';

  let baseRisk = 20;

  if (region === 'North' || region === 'East') baseRisk += 15;
  if (cardType === 'RuPay') baseRisk += 12;
  else if (cardType === 'MasterCard') baseRisk += 10;
  if (age === 'Elderly') baseRisk += 14;

  if (hour === 5 || hour === 11 || hour === 12 || hour === 14) baseRisk += 22;

  if (amount >= 4000 && amount <= 8000) baseRisk += 18;
  else if (amount > 15000) baseRisk += 25;

  return Math.min(Math.max(baseRisk, 5), 98);
}

function evaluateAndAddRiskRow() {
  const amount = parseFloat(document.getElementById('riskAmount')?.value || 5000);
  const cardType = document.getElementById('riskCardType')?.value || 'RuPay';
  const hour = parseInt(document.getElementById('riskHour')?.value || 5);
  const region = document.getElementById('riskRegion')?.value || 'North';
  const age = document.getElementById('riskAge')?.value || 'Elderly';

  const riskScore = calculateFraudRisk();
  let riskLevel = 'LOW';
  let badgeClass = 'low';
  let recommendation = '<span style="color:#15803d; font-weight:600;"><i class="fas fa-circle-check"></i> Auto-Approved</span>';

  if (riskScore > 40 && riskScore <= 70) {
    riskLevel = 'MEDIUM';
    badgeClass = 'medium';
    recommendation = '<span style="color:#b45309; font-weight:600;"><i class="fas fa-lock"></i> Standard OTP Verification</span>';
  } else if (riskScore > 70) {
    riskLevel = 'HIGH';
    badgeClass = 'high';
    recommendation = '<span style="color:#dc2626; font-weight:600;"><i class="fas fa-shield-exclamation"></i> Step-up Biometrics Required</span>';
  }

  const tbody = document.getElementById('riskMatrixTbody');
  if (!tbody) return;

  const txnId = `#TXN-${Math.floor(1000 + Math.random() * 9000)}`;
  const formattedHour = hour < 10 ? `0${hour}:00 AM` : (hour < 12 ? `${hour}:00 AM` : `${hour}:00 PM`);

  const tr = document.createElement('tr');
  tr.style.background = '#ecfdf5';
  tr.style.transition = 'background 1.5s ease';

  tr.innerHTML = `
    <td><strong>${txnId}</strong></td>
    <td>₹${amount.toLocaleString('en-IN')}</td>
    <td>${cardType}</td>
    <td>${formattedHour}</td>
    <td>${region}</td>
    <td>${age}</td>
    <td><strong>${riskScore}%</strong></td>
    <td><span class="risk-badge ${badgeClass}">${riskLevel} RISK</span></td>
    <td>${recommendation}</td>
  `;

  tbody.insertBefore(tr, tbody.firstChild);

  setTimeout(() => {
    tr.style.background = 'transparent';
  }, 1000);
}

// ─── RISK-BASED MESSAGES & REVIEWS FILTERING ───
function filterSellerMessages(filterType, btnElement) {
  const container = document.getElementById('sellerMessagesContainer');
  if (!container) return;

  const pills = btnElement.parentElement.querySelectorAll('.filter-tab-pill');
  pills.forEach(p => p.classList.remove('active'));
  btnElement.classList.add('active');

  const cards = container.querySelectorAll('.msg-list-card');
  cards.forEach(card => {
    const risk = card.getAttribute('data-risk');
    if (filterType === 'all') {
      if (risk === 'high') card.style.display = 'none';
      else card.style.display = 'block';
    } else if (filterType === 'high') {
      if (risk === 'high') card.style.display = 'block';
      else card.style.display = 'none';
    } else {
      if (risk === filterType) card.style.display = 'block';
      else card.style.display = 'none';
    }
  });
}

function filterSellerReviews(filterType, btnElement) {
  const container = document.getElementById('sellerReviewsContainer');
  if (!container) return;

  const pills = btnElement.parentElement.querySelectorAll('.filter-tab-pill');
  pills.forEach(p => p.classList.remove('active'));
  btnElement.classList.add('active');

  const cards = container.querySelectorAll('.review-item-card');
  cards.forEach(card => {
    const risk = card.getAttribute('data-risk');
    if (filterType === 'all') {
      if (risk === 'high') card.style.display = 'none';
      else card.style.display = 'block';
    } else if (filterType === 'high') {
      if (risk === 'high') card.style.display = 'block';
      else card.style.display = 'none';
    } else {
      if (risk === filterType) card.style.display = 'block';
      else card.style.display = 'none';
    }
  });
}

// ─── SELLER REPLY FLOAT BOX ───
let currentReplyTargetCustomer = '';

function openReplyModal(customerName, orderContext, riskScoreVal, riskBadgeClass) {
  currentReplyTargetCustomer = customerName;
  const overlay = document.getElementById('replyModalOverlay');
  const targetSpan = document.getElementById('replyTargetCustomer');
  const orderTag = document.getElementById('replyOrderTag');
  const badgeSlot = document.getElementById('replyRiskBadgeSlot');
  const textarea = document.getElementById('replyMessageTextarea');

  if (targetSpan) targetSpan.innerText = customerName;
  if (orderTag) orderTag.innerText = orderContext;
  if (textarea) textarea.value = '';

  if (badgeSlot) {
    let levelText = 'LOW RISK';
    if (riskBadgeClass === 'medium') levelText = 'MEDIUM RISK';
    else if (riskBadgeClass === 'high') levelText = 'HIGH RISK';

    badgeSlot.innerHTML = `<span class="risk-badge ${riskBadgeClass}">${levelText} (${riskScoreVal}%)</span>`;
  }

  if (overlay) overlay.classList.add('active');
}

function closeReplyModal() {
  const overlay = document.getElementById('replyModalOverlay');
  if (overlay) overlay.classList.remove('active');
}

function applyReplyTemplate(text) {
  const textarea = document.getElementById('replyMessageTextarea');
  if (textarea) textarea.value = text;
}

function sendReplyToCustomer() {
  const textarea = document.getElementById('replyMessageTextarea');
  const messageText = textarea?.value.trim();

  if (!messageText) {
    alert('Please enter a reply message before sending.');
    return;
  }

  closeReplyModal();
  showToastNotification(`✓ Reply sent to customer ${currentReplyTargetCustomer}! Message delivered.`);
}

// ─── CUSTOMER WRITE & SEND REVIEW TO SELLER DASHBOARD ───
function openWriteReviewForProduct(productName) {
  const select = document.getElementById('reviewProdSelect');
  if (select && productName) {
    select.value = productName;
  }
  const navItem = document.querySelector('#custNavList li[data-section="write-review"]');
  switchCustomerSection('write-review', navItem);
}

function submitCustomerReview(event) {
  event.preventDefault();
  
  const productName = document.getElementById('reviewProdSelect')?.value || 'Smart Watch X1';
  const ratingVal = document.getElementById('reviewRatingSelect')?.value || '5';
  const title = document.getElementById('reviewTitleInput')?.value.trim();
  const text = document.getElementById('reviewTextarea')?.value.trim();

  if (!title || !text) {
    alert('Please enter both a title and review feedback.');
    return;
  }

  const customerName = state.currentUser ? state.currentUser.name : 'Priya Sharma';
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  // Generate Star Rating HTML
  let starsHtml = '';
  const numStars = parseInt(ratingVal);
  for (let i = 0; i < 5; i++) {
    if (i < numStars) starsHtml += '★';
    else starsHtml += '☆';
  }

  // Insert review card into Seller Dashboard's Verified Store Reviews container (#sellerReviewsContainer)
  const sellerReviewsContainer = document.getElementById('sellerReviewsContainer');
  if (sellerReviewsContainer) {
    const card = document.createElement('div');
    card.className = 'review-item-card';
    card.setAttribute('data-risk', 'low');
    card.style.background = '#f0fdf4';
    card.style.borderLeft = '4px solid #10b981';
    card.style.transition = 'background 1.5s ease';

    card.innerHTML = `
      <div class="review-header">
        <div style="display:flex; align-items:center; gap:10px;">
          <strong style="color:#0f172a;" class="cust-user-name-display">${customerName}</strong>
          <span class="risk-badge low"><i class="fas fa-circle-check"></i> Low Risk Verified Buyer (12%)</span>
        </div>
        <span style="font-size:0.78rem; color:#64748b;">${dateStr}</span>
      </div>
      <div class="review-stars">${starsHtml} <span style="color:#0f172a; font-weight:600; font-size:0.85rem; margin-left:6px;">${ratingVal}.0 — ${title}</span></div>
      <p style="font-size:0.88rem; color:#334155; margin-top:0.4rem; line-height:1.4;">"${text}"</p>
      <div style="font-size:0.78rem; color:#059669; margin-top:0.4rem; font-weight:600;"><i class="fas fa-box"></i> Product: ${productName}</div>
    `;

    sellerReviewsContainer.insertBefore(card, sellerReviewsContainer.firstChild);

    setTimeout(() => {
      card.style.background = 'transparent';
    }, 1500);
  }

  // Reset Customer Review Form
  document.getElementById('customerReviewForm')?.reset();

  showToastNotification(`✓ Review for "${productName}" sent successfully! It is now published live in the Seller Dashboard.`);
}

// ─── CUSTOMER WRITE & SEND MESSAGE TO SELLER DASHBOARD ───
function openMessageSellerForOrder(orderContext) {
  const select = document.getElementById('msgOrderSelect');
  if (select && orderContext) {
    select.value = orderContext;
  }
  const navItem = document.querySelector('#custNavList li[data-section="contact-seller"]');
  switchCustomerSection('contact-seller', navItem);
}

function submitCustomerMessage(event) {
  event.preventDefault();
  
  const orderContext = document.getElementById('msgOrderSelect')?.value || '#ORD-7832 (Smart Watch X1)';
  const messageText = document.getElementById('msgBodyTextarea')?.value.trim();

  if (!messageText) {
    alert('Please enter a message before sending.');
    return;
  }

  const customerName = state.currentUser ? state.currentUser.name : 'Priya Sharma';

  // Derive initials
  const parts = customerName.trim().split(/\s+/);
  let initials = 'PS';
  if (parts.length === 1) initials = parts[0].substring(0, 2).toUpperCase();
  else if (parts.length > 1) initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();

  // Create message card for Seller Dashboard (#sellerMessagesContainer)
  const sellerMessagesContainer = document.getElementById('sellerMessagesContainer');
  if (sellerMessagesContainer) {
    const card = document.createElement('div');
    card.className = 'msg-list-card';
    card.setAttribute('data-risk', 'low');
    card.style.background = '#f0fdf4';
    card.style.borderLeft = '4px solid #10b981';
    card.style.transition = 'background 1.5s ease';

    card.innerHTML = `
      <div class="msg-card-top">
        <div class="msg-user-info">
          <div class="msg-avatar msg-avatar-user">${initials}</div>
          <div>
            <strong style="color:#0f172a; font-size:0.95rem;" class="cust-user-name-display">${customerName}</strong>
            <small style="color:#64748b; display:block;">Order: ${orderContext}</small>
          </div>
        </div>
        <span class="risk-badge low"><i class="fas fa-circle-check"></i> LOW RISK (12%) — Allowed</span>
      </div>
      <div class="msg-body-text">
        "${messageText}"
      </div>
      <div style="display:flex; gap:0.6rem; align-items:center;">
        <button onclick="openReplyModal('${customerName}', '${orderContext}', '12', 'low')" style="padding:0.4rem 1rem; border-radius:20px; border:none; background:#6366f1; color:#fff; font-weight:600; font-size:0.8rem; cursor:pointer;"><i class="fas fa-reply"></i> Reply to Buyer</button>
        <button style="padding:0.4rem 0.8rem; border-radius:20px; border:1px solid #ccc; background:#fff; font-size:0.8rem; cursor:pointer;">Mark Resolved</button>
      </div>
    `;

    sellerMessagesContainer.insertBefore(card, sellerMessagesContainer.firstChild);

    setTimeout(() => {
      card.style.background = 'transparent';
    }, 1500);
  }

  // Reset Form
  document.getElementById('customerMessageForm')?.reset();

  showToastNotification(`✓ Message for "${orderContext}" delivered live to Seller Dashboard inbox!`);
}

// ─── PRODUCT CATALOG MANAGEMENT (ADD, EDIT & INLINE FLOATING SETUP BOX) ───
function openAddProductModal() {
  const box = document.getElementById('productInlineFloatingBox');
  const title = document.getElementById('productFloatingBoxTitle');
  const isUpdate = document.getElementById('inlineEditIsUpdate');
  const submitBtn = document.getElementById('inlineProdSubmitBtn');
  
  if (isUpdate) isUpdate.value = 'false';
  if (title) {
    title.innerHTML = `<i class="fas fa-plus-circle" style="color:#10b981;"></i> Product Attribute Setup — Add New Store Product`;
  }
  if (submitBtn) {
    submitBtn.innerHTML = `<i class="fas fa-plus"></i> Save New Product Attributes`;
  }

  const idInput = document.getElementById('inlineProdId');
  const nameInput = document.getElementById('inlineProdName');
  const catInput = document.getElementById('inlineProdCat');
  const priceInput = document.getElementById('inlineProdPrice');
  const stockInput = document.getElementById('inlineProdStock');

  if (idInput) {
    idInput.value = `PRD-${Math.floor(105 + Math.random() * 800)}`;
    idInput.removeAttribute('readonly');
  }
  if (nameInput) nameInput.value = '';
  if (catInput) catInput.value = 'Electronics';
  if (priceInput) priceInput.value = '';
  if (stockInput) stockInput.value = '';

  if (box) {
    box.style.display = 'block';
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function openEditProductModal(id, name, cat, price, stock) {
  const box = document.getElementById('productInlineFloatingBox');
  const title = document.getElementById('productFloatingBoxTitle');
  const isUpdate = document.getElementById('inlineEditIsUpdate');
  const targetRowId = document.getElementById('inlineTargetRowId');
  const submitBtn = document.getElementById('inlineProdSubmitBtn');

  if (isUpdate) isUpdate.value = 'true';
  if (targetRowId) targetRowId.value = id;

  if (title) {
    title.innerHTML = `<i class="fas fa-edit" style="color:#6366f1;"></i> Product Attribute Setup — Edit Product #${id}`;
  }
  if (submitBtn) {
    submitBtn.innerHTML = `<i class="fas fa-save"></i> Update Product Attributes`;
  }

  const idInput = document.getElementById('inlineProdId');
  const nameInput = document.getElementById('inlineProdName');
  const catInput = document.getElementById('inlineProdCat');
  const priceInput = document.getElementById('inlineProdPrice');
  const stockInput = document.getElementById('inlineProdStock');

  if (idInput) {
    idInput.value = id;
    idInput.setAttribute('readonly', 'readonly');
  }
  if (nameInput) nameInput.value = name || '';
  if (catInput) catInput.value = cat || 'Electronics';
  if (priceInput) priceInput.value = price || 0;
  if (stockInput) stockInput.value = stock || 0;

  if (box) {
    box.style.display = 'block';
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function closeProductFloatingBox() {
  const box = document.getElementById('productInlineFloatingBox');
  if (box) box.style.display = 'none';
}

function closeAddProductModal() {
  closeProductFloatingBox();
}

function closeEditProductModal() {
  closeProductFloatingBox();
}

function submitSaveProductInline(event) {
  event.preventDefault();
  const isUpdate = document.getElementById('inlineEditIsUpdate')?.value === 'true';
  const targetRowId = document.getElementById('inlineTargetRowId')?.value;

  const id = document.getElementById('inlineProdId')?.value.trim() || `PRD-105`;
  const name = document.getElementById('inlineProdName')?.value.trim();
  const cat = document.getElementById('inlineProdCat')?.value || 'Electronics';
  const price = parseFloat(document.getElementById('inlineProdPrice')?.value || 0);
  const stock = parseInt(document.getElementById('inlineProdStock')?.value || 0);

  if (!name) {
    alert('Please enter a product name.');
    return;
  }

  const tbody = document.getElementById('productCatalogTbody');
  if (!tbody) return;

  if (isUpdate && targetRowId) {
    const row = document.getElementById(`prod-row-${targetRowId}`);
    if (row) {
      const nameTd = row.querySelector('.prod-name-td');
      const catTd = row.querySelector('.prod-cat-td');
      const priceTd = row.querySelector('.prod-price-td');
      const stockTd = row.querySelector('.prod-stock-td');
      const editBtn = row.querySelector('button');

      if (nameTd) nameTd.innerText = name;
      if (catTd) catTd.innerText = cat;
      if (priceTd) priceTd.innerText = `₹${price.toLocaleString('en-IN')}`;
      if (stockTd) stockTd.innerText = `${stock} in stock`;

      if (editBtn) {
        editBtn.setAttribute('onclick', `openEditProductModal('${targetRowId}', '${name}', '${cat}', ${price}, ${stock})`);
      }

      row.style.background = '#e0f2fe';
      setTimeout(() => { row.style.background = 'transparent'; }, 1200);
      showToastNotification(`✓ Product attributes for #${targetRowId} updated successfully!`);
    }
  } else {
    const tr = document.createElement('tr');
    tr.id = `prod-row-${id}`;
    tr.className = 'seller-prod-row';
    tr.style.background = '#ecfdf5';
    tr.style.transition = 'background 1.5s ease';

    tr.innerHTML = `
      <td><strong>#${id}</strong></td>
      <td class="prod-name-td">${name}</td>
      <td class="prod-cat-td">${cat}</td>
      <td class="prod-price-td">₹${price.toLocaleString('en-IN')}</td>
      <td><span class="badge-status delivered prod-stock-td">${stock} in stock</span></td>
      <td>
        <button onclick="openEditProductModal('${id}', '${name}', '${cat}', ${price}, ${stock})" style="padding:0.4rem 0.8rem; border-radius:20px; border:1px solid #6366f1; background:#ede9fe; color:#6366f1; font-weight:600; cursor:pointer;"><i class="fas fa-edit"></i> Edit Product</button>
      </td>
    `;

    tbody.insertBefore(tr, tbody.firstChild);

    setTimeout(() => { tr.style.background = 'transparent'; }, 1200);
    showToastNotification(`✓ New product "${name}" added to catalog!`);
  }

  closeProductFloatingBox();
}

// ─── SELLER DASHBOARD SEARCH & FILTERING LOGIC ───

function filterSellerGlobalSearch(query) {
  const q = query.toLowerCase().trim();
  filterSellerOrdersTable(q);
  filterSellerProductsTable(q);
  filterSellerRiskTable(q);
  filterSellerReturnsTable(q);
  filterSellerReviewsCards(q);
  filterSellerMessagesCards(q);
  filterSellerAnalyticsCharts(q);
  filterSellerPayouts(q);
}

function filterSellerMessagesCards(query) {
  const q = query.toLowerCase().trim();
  const cards = document.querySelectorAll('#sellerMessagesContainer .msg-list-card');
  cards.forEach(card => {
    const text = card.innerText.toLowerCase();
    if (!q || text.includes(q)) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}

function filterSellerOrdersTable(query) {
  const q = query.toLowerCase().trim();
  const rows = document.querySelectorAll('#sellerOrdersTbody tr, .seller-order-row');
  rows.forEach(row => {
    const text = row.innerText.toLowerCase();
    if (!q || text.includes(q)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

function filterSellerProductsTable(query) {
  const q = query.toLowerCase().trim();
  const rows = document.querySelectorAll('#productCatalogTbody tr, .seller-prod-row');
  rows.forEach(row => {
    const text = row.innerText.toLowerCase();
    if (!q || text.includes(q)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

function filterSellerRiskTable(query) {
  const q = query.toLowerCase().trim();
  const rows = document.querySelectorAll('#riskMatrixTbody tr, .seller-risk-row');
  rows.forEach(row => {
    const text = row.innerText.toLowerCase();
    if (!q || text.includes(q)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

function filterSellerReturnsTable(query) {
  const q = query.toLowerCase().trim();
  const rows = document.querySelectorAll('#sellerReturnsTbody tr, .seller-return-row');
  rows.forEach(row => {
    const text = row.innerText.toLowerCase();
    if (!q || text.includes(q)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

function filterSellerReviewsCards(query) {
  const q = query.toLowerCase().trim();
  const cards = document.querySelectorAll('#sellerReviewsContainer .review-item-card');
  cards.forEach(card => {
    const text = card.innerText.toLowerCase();
    if (!q || text.includes(q)) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}

function filterSellerAnalyticsCharts(query) {
  const q = query.toLowerCase().trim();
  const cards = document.querySelectorAll('#section-analytics .eda-chart-card');
  cards.forEach(card => {
    const text = card.innerText.toLowerCase();
    if (!q || text.includes(q)) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}

function filterSellerPayouts(query) {
  const q = query.toLowerCase().trim();
  const container = document.querySelector('#section-payouts .section-full-box');
  if (container) {
    const text = container.innerText.toLowerCase();
    if (!q || text.includes(q)) {
      container.style.display = '';
    } else {
      container.style.display = 'none';
    }
  }
}

// ─── CUSTOMER DASHBOARD SEARCH & SAVED CARDS LOGIC ───

function filterCustomerGlobalSearch(query) {
  const q = query.toLowerCase().trim();

  // Filter individual customer sections
  filterCustomerOrdersTable(q);
  filterCustomerTrackingTimeline(q);
  filterCustomerWishlistCards(q);
  filterCustomerSavedCards(q);
  filterCustomerAnalyticsCharts(q);
}

function filterCustomerAnalyticsCharts(query) {
  const q = query.toLowerCase().trim();
  const cards = document.querySelectorAll('#cust-section-analytics .eda-chart-card');
  cards.forEach(card => {
    const text = card.innerText.toLowerCase();
    if (!q || text.includes(q)) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}

function filterCustomerOrdersTable(query) {
  const q = query.toLowerCase().trim();
  const rows = document.querySelectorAll('#custOrdersTbody tr');
  rows.forEach(row => {
    const text = row.innerText.toLowerCase();
    if (!q || text.includes(q)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

function filterCustomerTrackingTimeline(query) {
  const q = query.toLowerCase().trim();
  const steps = document.querySelectorAll('#custTrackingTimelineContainer .timeline-step');
  steps.forEach(step => {
    const text = step.innerText.toLowerCase();
    if (!q || text.includes(q)) {
      step.style.display = '';
    } else {
      step.style.display = 'none';
    }
  });
}

function filterCustomerWishlistCards(query) {
  const q = query.toLowerCase().trim();
  const cards = document.querySelectorAll('#custWishlistGridContainer .wishlist-card');
  cards.forEach(card => {
    const text = card.innerText.toLowerCase();
    if (!q || text.includes(q)) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}

function filterCustomerSavedCards(query) {
  const q = query.toLowerCase().trim();
  const cards = document.querySelectorAll('#savedCardsGridContainer .credit-card-item');
  cards.forEach(card => {
    const text = card.innerText.toLowerCase();
    if (!q || text.includes(q)) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}

function filterCustomerAnalytics(query) {
  const q = query.toLowerCase().trim();
  const cards = document.querySelectorAll('#cust-section-analytics .eda-chart-card');
  cards.forEach(card => {
    const text = card.innerText.toLowerCase();
    if (!q || text.includes(q)) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}

// ─── INLINE FLOATING SAVED CARD CREATION BOX ───
function toggleInlineAddCardBox() {
  const box = document.getElementById('addCardInlineFloatingBox');
  if (!box) return;

  if (box.style.display === 'none' || !box.style.display) {
    box.style.display = 'block';
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    const bankInput = document.getElementById('inlineCardBank');
    if (bankInput) bankInput.focus();
  } else {
    box.style.display = 'none';
  }
}

function submitAddSavedCardInline(event) {
  event.preventDefault();
  const bank = document.getElementById('inlineCardBank')?.value.trim();
  const holder = document.getElementById('inlineCardHolder')?.value.trim();
  const num = document.getElementById('inlineCardNum')?.value.trim();
  const expiry = document.getElementById('inlineCardExpiry')?.value.trim();
  const theme = document.getElementById('inlineCardTheme')?.value || 'hdfc-theme';

  if (!bank || !holder || !num || !expiry) return;

  const cleanNum = num.replace(/\s+/g, '');
  const last4 = cleanNum.slice(-4) || '1234';

  let network = 'RuPay';
  if (cleanNum.startsWith('4')) network = 'Visa';
  else if (cleanNum.startsWith('5')) network = 'MasterCard';

  let badgeText = 'Tokenized & Biometric Protected';
  let badgeIcon = 'fa-shield-check';
  if (theme === 'icici-theme') { badgeText = '3D-Secure 2.0 Enabled'; badgeIcon = 'fa-fingerprint'; }
  else if (theme === 'axis-theme') { badgeText = 'Virtual Card Masking Active'; badgeIcon = 'fa-user-shield'; }
  else if (theme === 'sbi-theme') { badgeText = 'FraudShield Insured'; badgeIcon = 'fa-lock'; }

  const container = document.getElementById('savedCardsGridContainer');
  if (!container) return;

  const cardDiv = document.createElement('div');
  cardDiv.className = `credit-card-item ${theme}`;
  cardDiv.style.animation = 'modalPop 0.35s ease';

  cardDiv.innerHTML = `
    <div class="card-top-row">
      <div class="card-bank-name"><i class="fas fa-building-columns"></i> ${bank}</div>
      <div class="card-network-logo" style="color:#ffffff;">${network}</div>
    </div>
    <div class="card-chip-row">
      <div class="card-chip"></div>
      <i class="fas fa-wifi" style="transform:rotate(90deg); opacity:0.8;"></i>
    </div>
    <div class="card-number-display">•••• •••• •••• ${last4}</div>
    <div class="card-bottom-row">
      <div>
        <span class="card-holder-label">Card Holder</span>
        <span class="card-holder-val">${holder}</span>
      </div>
      <div>
        <span class="card-holder-label">Expires</span>
        <span class="card-holder-val">${expiry}</span>
      </div>
    </div>
    <div class="card-security-badge">
      <i class="fas ${badgeIcon}"></i> ${badgeText}
    </div>
  `;

  container.insertBefore(cardDiv, container.firstChild);
  toggleInlineAddCardBox();
  document.getElementById('inlineAddCardForm')?.reset();
  showToastNotification(`✓ Encrypted ${bank} card ending in ${last4} saved to your vault!`);
}

// ─── SAVED PAYMENT CARDS MODAL MANAGEMENT ───
function openAddCardModal() {
  toggleInlineAddCardBox();
}

function closeAddCardModal() {
  const overlay = document.getElementById('addCardModalOverlay');
  if (overlay) overlay.classList.remove('active');
}

function submitAddSavedCard(event) {
  event.preventDefault();
  const bank = document.getElementById('newCardBank')?.value.trim();
  const holder = document.getElementById('newCardHolder')?.value.trim();
  const num = document.getElementById('newCardNum')?.value.trim();
  const expiry = document.getElementById('newCardExpiry')?.value.trim();
  const theme = document.getElementById('newCardTheme')?.value || 'hdfc-theme';

  if (!bank || !holder || !num || !expiry) return;

  const cleanNum = num.replace(/\s+/g, '');
  const last4 = cleanNum.slice(-4) || '1234';

  let network = 'RuPay';
  if (cleanNum.startsWith('4')) network = 'Visa';
  else if (cleanNum.startsWith('5')) network = 'MasterCard';

  let badgeText = 'Tokenized & Biometric Protected';
  let badgeIcon = 'fa-shield-check';
  if (theme === 'icici-theme') { badgeText = '3D-Secure 2.0 Enabled'; badgeIcon = 'fa-fingerprint'; }
  else if (theme === 'axis-theme') { badgeText = 'Virtual Card Masking Active'; badgeIcon = 'fa-user-shield'; }
  else if (theme === 'sbi-theme') { badgeText = 'FraudShield Insured'; badgeIcon = 'fa-lock'; }

  const container = document.getElementById('savedCardsGridContainer');
  if (!container) return;

  const cardDiv = document.createElement('div');
  cardDiv.className = `credit-card-item ${theme}`;
  cardDiv.style.animation = 'modalPop 0.3s ease';

  cardDiv.innerHTML = `
    <div class="card-top-row">
      <div class="card-bank-name"><i class="fas fa-building-columns"></i> ${bank}</div>
      <div class="card-network-logo" style="color:#ffffff;">${network}</div>
    </div>
    <div class="card-chip-row">
      <div class="card-chip"></div>
      <i class="fas fa-wifi" style="transform:rotate(90deg); opacity:0.8;"></i>
    </div>
    <div class="card-number-display">•••• •••• •••• ${last4}</div>
    <div class="card-bottom-row">
      <div>
        <span class="card-holder-label">Card Holder</span>
        <span class="card-holder-val">${holder}</span>
      </div>
      <div>
        <span class="card-holder-label">Expires</span>
        <span class="card-holder-val">${expiry}</span>
      </div>
    </div>
    <div class="card-security-badge">
      <i class="fas ${badgeIcon}"></i> ${badgeText}
    </div>
  `;

  container.insertBefore(cardDiv, container.firstChild);
  closeAddCardModal();
  showToastNotification(`✓ Encrypted card (${bank} ending in ${last4}) saved to vault!`);
}

// ─── TOAST NOTIFICATION HELPER ───
function showToastNotification(text) {
  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.innerHTML = `<i class="fas fa-circle-check"></i> <span>${text}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// ─── UTILITY HELPERS ───
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
