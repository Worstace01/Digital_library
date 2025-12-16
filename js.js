document.addEventListener("DOMContentLoaded", () => {
    let state = {
        user: JSON.parse(localStorage.getItem('digital_library_user')) || null,
        activeCategory: "All", // <--- FIX: Changed "all" to "All" to match the category list
        wishlist: [], 
        darkMode: localStorage.getItem('theme') === 'dark',
        pendingBorrowBook: null,
        announcements: [] 
    };

    const els = {
        navbar: document.getElementById('navbar'),
        themeToggle: document.getElementById('themeToggle'),
        sections: {
            home: document.getElementById('homeSection'),
            student: document.getElementById('studentSection'),
            admin: document.getElementById('adminSection')
        },
        links: {
            home: document.getElementById('homeLink'),
            myBooks: document.getElementById('myBooksLink'),
            admin: document.getElementById('adminLink')
        },
        auth: {
            loginBtn: document.getElementById('loginBtn'),
            signupBtn: document.getElementById('signupBtn'),
            authButtons: document.getElementById('authButtons'),
            userMenu: document.getElementById('userMenu'),
            userName: document.getElementById('userNameDisplay'),
            logoutBtn: document.getElementById('logoutBtn')
        },
        grids: {
            books: document.getElementById('bookList'),
            categories: document.getElementById('categoryList'),
            news: document.getElementById('publicAnnouncementsList')
        },
        modals: {
            login: document.getElementById('loginModal'),
            signup: document.getElementById('signupModal'),
            appoint: document.getElementById('appointmentModal'),
            addBook: document.getElementById('addBookModal'),
            addNews: document.getElementById('addAnnouncementModal'),
            lightbox: document.getElementById('lightboxModal'),
            feedback: document.getElementById('feedbackModal')
        },
        switchAuth: {
            toSignup: document.getElementById('openSignupFromLogin'),
            toLogin: document.getElementById('openLoginFromSignup')
        }
    };

    const categories = ["All", "Fiction", "Non-Fiction", "Manga", "Science", "History"];
    let books = []; 

    function init() {
        applyTheme();
        renderCategories();
        updateAuthUI();
        
        fetchBooks();
        fetchAnnouncements();

        if (state.user) fetchFavorites(); 

        if(state.user && state.user.role === 'Admin') {
            fetchAdminData();
            showAdminPanel();
        } else if (state.user) {
             showStudentDashboard();
        } else {
             showHome();
        }
        
        initCarousel();
        setupEventListeners();
    }

    async function fetchBooks() {
        try {
            const res = await fetch('api.php?action=get_books');
            books = await res.json();
            renderBooks();
            if(state.user && state.user.role === 'Admin') renderAdminTable();
        } catch (e) { console.error("Error loading books", e); }
    }

    async function fetchFavorites() {
        if (!state.user) return;
        try {
            const res = await fetch(`api.php?action=get_favorites&user_id=${state.user.id}`);
            state.wishlist = await res.json();
            renderBooks(); 
        } catch (e) { console.error("Error loading favorites", e); }
    }
    
    async function fetchAnnouncements() {
        try {
            const res = await fetch('api.php?action=get_announcements');
            state.announcements = await res.json();
            renderPublicAnnouncements();
            if(state.user && state.user.role === 'Admin') renderAdminAnnouncements();
        } catch (e) { console.error("Error loading news", e); }
    }

    async function fetchAdminData() {
        try {
            const [usersRes, apptRes] = await Promise.all([
                fetch('api.php?action=get_users'),
                fetch('api.php?action=get_appointments')
            ]);
            const users = await usersRes.json();
            const appts = await apptRes.json();
            
            renderUserTable(users);
            renderAdminAppointments(appts);
            updateAdminStats(books, users);
            renderAdminAnnouncements();
        } catch (e) { console.error("Error loading admin data", e); }
    }

    function generateStars(rating) {
        let stars = '';
        for (let i = 0; i < 5; i++) {
            stars += `<i class="fas fa-star ${i < rating ? 'text-yellow-400' : 'text-gray-300'} text-xs"></i>`;
        }
        return stars;
    }
    
    function renderPublicAnnouncements() {
        if (!state.announcements.length) {
            document.getElementById('announcementsSection').classList.add('hidden');
            return;
        }
        document.getElementById('announcementsSection').classList.remove('hidden');
        els.grids.news.innerHTML = state.announcements.map(news => {
            let typeColor = 'bg-blue-100 text-blue-700';
            if (news.type === 'Event') typeColor = 'bg-purple-100 text-purple-700';
            if (news.type === 'Update') typeColor = 'bg-orange-100 text-orange-700';

            return `
            <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition">
                <div class="flex justify-between items-start mb-4">
                    <span class="${typeColor} px-2 py-1 rounded text-xs font-bold uppercase">${news.type}</span>
                    <span class="text-xs text-gray-400 font-medium">${news.date}</span>
                </div>
                <h3 class="font-bold text-lg text-gray-800 dark:text-white mb-2 line-clamp-1">${news.title}</h3>
                <p class="text-gray-500 dark:text-gray-400 text-sm line-clamp-3">${news.content}</p>
            </div>
            `;
        }).join('');
    }

    function renderAdminAnnouncements() {
        const tbody = document.querySelector("#adminNewsTable tbody");
        if (!tbody) return;
        
        tbody.innerHTML = state.announcements.map(news => `
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition border-b border-gray-100 dark:border-gray-700">
                <td class="p-4 text-sm text-gray-500">${news.date}</td>
                <td class="p-4"><span class="px-2 py-1 rounded text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">${news.type}</span></td>
                <td class="p-4 font-bold dark:text-white">${news.title}</td>
                <td class="p-4 text-sm text-gray-500 max-w-xs truncate">${news.content}</td>
                <td class="p-4 text-right">
                    <button class="text-red-500 delete-news-btn" data-id="${news.id}"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');

        document.querySelectorAll('.delete-news-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if(confirm("Delete this announcement?")) {
                    await fetch('api.php?action=delete_announcement', { 
                        method: 'POST', 
                        body: JSON.stringify({ id: e.currentTarget.dataset.id }) 
                    });
                    fetchAnnouncements();
                    showToast("Announcement deleted");
                }
            });
        });
    }

    function renderBooks() {
        const filterText = document.getElementById("searchInput").value.toLowerCase();
        const filterStatus = document.getElementById("filterStatus").value;

        const filtered = books.filter(b => {
            const matchesText = b.title.toLowerCase().includes(filterText) || b.author.toLowerCase().includes(filterText);
            
            // This line was causing the issue because state.activeCategory was "all" but categories has "All"
            const matchesCat = state.activeCategory === 'All' ? true : b.category === state.activeCategory;
            
            let matchesStatus = true;
            if (filterStatus === 'available') matchesStatus = b.status === 'available';
            if (filterStatus === 'borrowed') matchesStatus = b.status === 'borrowed';
            if (filterStatus === 'favorites') matchesStatus = state.wishlist.includes(b.id);
            return matchesText && matchesCat && matchesStatus;
        });

        els.grids.books.innerHTML = filtered.map(book => {
            const statusBadge = book.status === 'available' 
                ? '<span class="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded text-xs font-bold">Available</span>'
                : '<span class="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-1 rounded text-xs font-bold">Borrowed</span>';

            const isFav = state.wishlist.includes(book.id);

            return `
            <div class="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl transition border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col relative">
                <div class="relative h-64 overflow-hidden">
                    <img src="${book.image}" class="w-full h-full object-cover group-hover:scale-110 transition duration-700">
                    
                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center gap-3">
                         <button class="w-10 h-10 bg-white rounded-full text-gray-800 hover:text-brand-600 flex items-center justify-center shadow-lg transform translate-y-4 group-hover:translate-y-0 transition delay-75 lightbox-trigger" data-src="${book.image}"><i class="fas fa-eye"></i></button>
                         <button class="w-10 h-10 bg-white rounded-full ${isFav ? 'text-red-500' : 'text-gray-800'} hover:text-red-500 flex items-center justify-center shadow-lg transform translate-y-4 group-hover:translate-y-0 transition delay-100 fav-btn" data-id="${book.id}"><i class="${isFav ? 'fas' : 'far'} fa-heart"></i></button>
                    </div>

                    <div class="absolute top-3 left-3">
                        <span class="bg-white/90 backdrop-blur text-xs font-bold px-2 py-1 rounded-md shadow-sm">${book.category}</span>
                    </div>
                </div>
                <div class="p-5 flex flex-col flex-grow">
                    <h3 class="font-bold text-gray-800 dark:text-white text-lg line-clamp-1">${book.title}</h3>
                    <p class="text-gray-500 text-sm mb-2">${book.author}</p>
                    
                    <div class="flex items-center gap-1 mb-4">
                        ${generateStars(book.rating)}
                        <span class="text-xs text-gray-400 ml-1">(${book.rating}.0)</span>
                    </div>

                    <div class="mt-auto flex items-center justify-between">
                        ${statusBadge}
                        <button class="borrow-btn text-sm font-bold ${book.status === 'available' ? 'text-brand-600 hover:text-brand-700' : 'text-gray-400 cursor-not-allowed'}" 
                                data-id="${book.id}" ${book.status !== 'available' ? 'disabled' : ''}>
                            ${book.status === 'available' ? 'Borrow' : 'Unavailable'} <i class="fas fa-arrow-right ml-1"></i>
                        </button>
                    </div>
                </div>
            </div>`;
        }).join('');

        attachCardEvents();
    }

    function attachCardEvents() {
        document.querySelectorAll('.lightbox-trigger').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const src = e.currentTarget.dataset.src;
                document.getElementById('lightboxImg').src = src;
                const modal = els.modals.lightbox;
                modal.classList.remove('hidden');
                modal.classList.add('flex');
            });
        });

        document.querySelectorAll('.fav-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if (!state.user) return showToast("Login to save favorites", "error");
                
                const bookId = parseInt(e.currentTarget.dataset.id);
                const res = await fetch('api.php?action=toggle_favorite', {
                    method: 'POST',
                    body: JSON.stringify({ user_id: state.user.id, book_id: bookId })
                });
                const data = await res.json();
                
                if (data.status === 'success') {
                    if (data.fav_status === 'added') {
                        state.wishlist.push(bookId);
                        showToast("Added to favorites");
                    } else {
                        state.wishlist = state.wishlist.filter(id => id !== bookId);
                        showToast("Removed from favorites");
                    }
                    renderBooks(); 
                }
            });
        });

        document.querySelectorAll('.borrow-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (!state.user) {
                    showToast("Please login first", "error");
                    els.modals.login.classList.remove('hidden');
                    els.modals.login.classList.add('flex');
                    return;
                }
                const id = parseInt(e.currentTarget.dataset.id);
                state.pendingBorrowBook = books.find(b => b.id === id);
                document.getElementById('appointmentBookTitle').value = state.pendingBorrowBook.title;
                document.getElementById('bookFieldContainer').classList.remove('hidden');
                document.getElementById('appointmentPurpose').value = 'Borrow Book';
                els.modals.appoint.classList.remove('hidden');
                els.modals.appoint.classList.add('flex');
            });
        });
    }

    function applyTheme() {
        if (state.darkMode) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    }
    
    els.themeToggle.addEventListener('click', () => {
        state.darkMode = !state.darkMode;
        localStorage.setItem('theme', state.darkMode ? 'dark' : 'light');
        applyTheme();
    });

    function updateAuthUI() {
        if (state.user) {
            els.auth.authButtons.classList.add('hidden');
            els.auth.userMenu.classList.remove('hidden');
            els.auth.userMenu.classList.add('flex');
            els.auth.userName.textContent = state.user.name.split(' ')[0];
            
            if (state.user.role === 'Student') els.links.myBooks.classList.remove('hidden');
            if (state.user.role === 'Admin') els.links.admin.classList.remove('hidden');
        } else {
            els.auth.authButtons.classList.remove('hidden');
            els.auth.userMenu.classList.add('hidden');
            els.links.myBooks.classList.add('hidden');
            els.links.admin.classList.add('hidden');
        }
    }

    async function login(username, password) {
        const res = await fetch('api.php?action=login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        
        if (data.status === 'success') {
            state.user = data.user;
            localStorage.setItem('digital_library_user', JSON.stringify(state.user));
            updateAuthUI();
            showToast(`Welcome back, ${state.user.name}`);
            
            fetchFavorites(); 

            if (state.user.role === 'Admin') showAdminPanel();
            else showStudentDashboard();
            
            els.modals.login.classList.add('hidden');
            els.modals.login.classList.remove('flex');
        } else {
            showToast(data.message, 'error');
        }
    }

    async function register(name, username, password) {
        const res = await fetch('api.php?action=register', {
            method: 'POST',
            body: JSON.stringify({ name, username, password })
        });
        const data = await res.json();

        if (data.status === 'success') {
            showToast("Account created! Please login.");
            els.modals.signup.classList.add('hidden');
            els.modals.signup.classList.remove('flex');
            els.modals.login.classList.remove('hidden');
            els.modals.login.classList.add('flex');
        } else {
            showToast(data.message, 'error');
        }
    }

    function hideAllSections() {
        Object.values(els.sections).forEach(el => el.classList.add('hidden'));
        [els.links.home, els.links.myBooks, els.links.admin].forEach(l => {
            l.classList.remove('active-nav-pill');
            l.classList.add('text-gray-500', 'hover:text-brand-600');
        });
    }

    function setActiveLink(link) {
        link.classList.remove('text-gray-500', 'hover:text-brand-600');
        link.classList.add('active-nav-pill');
    }

    function showHome() {
        hideAllSections();
        els.sections.home.classList.remove('hidden');
        setActiveLink(els.links.home);
        renderBooks();
    }

    function showStudentDashboard() {
        hideAllSections();
        els.sections.student.classList.remove('hidden');
        setActiveLink(els.links.myBooks);
        renderStudentTable();
    }

    function showAdminPanel() {
        if (!state.user || state.user.role !== 'Admin') return;
        hideAllSections();
        els.sections.admin.classList.remove('hidden');
        setActiveLink(els.links.admin);
        fetchAdminData();
    }

    function renderCategories() {
        els.grids.categories.innerHTML = categories.map(cat => `
            <button class="cat-btn w-full text-left px-4 py-3 rounded-xl transition text-sm font-medium ${cat === 'All' ? 'bg-brand-600 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700'}" 
            data-category="${cat}">
                ${cat}
            </button>
        `).join('');

        document.querySelectorAll('.cat-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.cat-btn').forEach(b => {
                    b.classList.remove('bg-brand-600', 'text-white', 'shadow-lg');
                    b.classList.add('text-gray-600', 'dark:text-gray-400');
                });
                e.currentTarget.classList.add('bg-brand-600', 'text-white', 'shadow-lg');
                e.currentTarget.classList.remove('text-gray-600', 'dark:text-gray-400');
                state.activeCategory = e.currentTarget.dataset.category;
                renderBooks();
            });
        });
    }

    function renderAdminTable() {
        const tbody = document.querySelector("#adminBookTable tbody");
        tbody.innerHTML = books.map(book => `
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition border-b border-gray-100 dark:border-gray-700">
                <td class="p-4 text-xs text-gray-400">#${book.id}</td>
                <td class="p-4 font-medium dark:text-white">${book.title}</td>
                <td class="p-4 text-sm text-gray-500">${book.category}</td>
                <td class="p-4"><span class="px-2 py-1 rounded text-xs font-bold ${book.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${book.status}</span></td>
                <td class="p-4 text-right">
                    ${book.status === 'borrowed' ? `<button class="text-green-600 mr-2 return-btn" data-id="${book.id}">Return</button>` : ''}
                    <button class="text-red-500 delete-btn" data-id="${book.id}"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');

        document.querySelectorAll('.return-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                await fetch('api.php?action=return_book', { method: 'POST', body: JSON.stringify({ id: e.target.dataset.id }) });
                fetchBooks();
                showToast("Book returned");
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if(confirm("Delete book?")) {
                    await fetch('api.php?action=delete_book', { method: 'POST', body: JSON.stringify({ id: e.currentTarget.dataset.id }) });
                    fetchBooks();
                    showToast("Book deleted");
                }
            });
        });
    }

    function renderUserTable(users) {
        document.querySelector("#adminUserTable tbody").innerHTML = users.map(u => `
            <tr class="border-b border-gray-100 dark:border-gray-700">
                <td class="p-4 font-bold dark:text-white">${u.name}</td>
                <td class="p-4 text-sm text-gray-500">${u.role}</td>
                <td class="p-4 text-sm text-gray-400">${u.date}</td>
            </tr>
        `).join('');
    }

    function renderAdminAppointments(appts) {
        document.querySelector("#adminApptTable tbody").innerHTML = appts.map(a => {
            // Helper to generate stars for the table
            let stars = '-';
            if (a.user_rating) {
                stars = '';
                for (let i = 0; i < 5; i++) {
                    stars += `<i class="fas fa-star ${i < a.user_rating ? 'text-yellow-400' : 'text-gray-300'} text-xs"></i>`;
                }
            }

            return `
            <tr class="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                <td class="p-4 font-bold dark:text-white">${a.student_name}</td>
                <td class="p-4 text-sm">${a.date}</td>
                <td class="p-4 text-sm font-medium text-brand-600">${a.book_title || '-'}</td>
                <td class="p-4">${stars}</td>
                <td class="p-4 text-sm text-gray-500 italic max-w-xs truncate">${a.feedback ? '"' + a.feedback + '"' : '<span class="text-gray-300">No review</span>'}</td>
            </tr>
            `;
        }).join('');
    }
    
    function updateAdminStats(books, users) {
        document.getElementById("statTotal").textContent = books.length;
        document.getElementById("statBorrowed").textContent = books.filter(b => b.status === 'borrowed').length;
        document.getElementById("statUsers").textContent = users.length;
    }

    async function renderStudentTable() {
        if (!state.user) return;

        const tbody = document.getElementById("studentBookList");
        
        tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-gray-400">Loading your books...</td></tr>`;

        try {
            const res = await fetch(`api.php?action=get_user_borrowed_books&student=${encodeURIComponent(state.user.name)}`);
            const myBooks = await res.json();

            if (myBooks.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-gray-400">You haven't borrowed any books yet.</td></tr>`;
                return;
            }

            tbody.innerHTML = myBooks.map(appt => {
                const hasFeedback = appt.feedback !== null;
                const feedbackBtn = hasFeedback 
                    ? `<span class="text-green-500 text-sm"><i class="fas fa-check"></i> Reviewed</span>` 
                    : `<button class="text-brand-600 hover:text-brand-800 font-bold text-sm bg-brand-50 hover:bg-brand-100 px-3 py-1 rounded-full transition open-feedback-btn" data-id="${appt.id}" data-title="${appt.book_title}">Rate & Return</button>`;

                return `
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition border-b border-gray-100 dark:border-gray-700">
                    <td class="p-6">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 rounded bg-brand-100 text-brand-600 flex items-center justify-center text-lg">
                                <i class="fas fa-book"></i>
                            </div>
                            <div>
                                <div class="font-bold text-gray-800 dark:text-white">${appt.book_title}</div>
                                <div class="text-xs text-gray-500 dark:text-gray-400">Borrowed via Appointment</div>
                            </div>
                        </div>
                    </td>
                    <td class="p-6 text-brand-600 font-medium">${appt.date}</td>
                    <td class="p-6">
                        <span class="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-bold">
                            Active
                        </span>
                    </td>
                    <td class="p-6">
                        ${feedbackBtn}
                    </td>
                </tr>`;
            }).join('');
            
            document.querySelectorAll('.open-feedback-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.currentTarget.dataset.id;
                    const title = e.currentTarget.dataset.title;
                    
                    document.getElementById('feedbackApptId').value = id;
                    document.getElementById('feedbackBookTitle').textContent = title;
                    document.querySelectorAll('.star-input').forEach(s => s.classList.remove('text-yellow-400'));
                    document.querySelectorAll('.star-input').forEach(s => s.classList.add('text-gray-300'));
                    document.getElementById('selectedRating').value = 5;
                    document.getElementById('feedbackText').value = '';
                    
                    els.modals.feedback.classList.remove('hidden');
                    els.modals.feedback.classList.add('flex');
                });
            });

        } catch (e) {
            console.error("Error loading student books", e);
            tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-red-400">Error loading data.</td></tr>`;
        }
    }

    function setupEventListeners() {
        els.links.home.addEventListener('click', (e) => { e.preventDefault(); showHome(); });
        els.links.myBooks.addEventListener('click', (e) => { e.preventDefault(); showStudentDashboard(); });
        els.links.admin.addEventListener('click', (e) => { e.preventDefault(); showAdminPanel(); });
        document.getElementById('searchInput').addEventListener('input', renderBooks);
        document.getElementById('filterStatus').addEventListener('change', renderBooks);
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.fixed').classList.add('hidden');
                e.target.closest('.fixed').classList.remove('flex');
            });
        });
        els.auth.loginBtn.addEventListener('click', () => { els.modals.login.classList.remove('hidden'); els.modals.login.classList.add('flex'); });
        els.auth.signupBtn.addEventListener('click', () => { els.modals.signup.classList.remove('hidden'); els.modals.signup.classList.add('flex'); });
        els.switchAuth.toSignup.addEventListener('click', () => {
             els.modals.login.classList.add('hidden'); els.modals.login.classList.remove('flex');
             els.modals.signup.classList.remove('hidden'); els.modals.signup.classList.add('flex');
        });
        els.switchAuth.toLogin.addEventListener('click', () => {
             els.modals.signup.classList.add('hidden'); els.modals.signup.classList.remove('flex');
             els.modals.login.classList.remove('hidden'); els.modals.login.classList.add('flex');
        });
        els.auth.logoutBtn.addEventListener('click', () => {
            state.user = null;
            state.wishlist = [];
            localStorage.removeItem('digital_library_user'); 
            updateAuthUI();
            showHome();
            showToast("Logged out");
        });
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            login(document.getElementById('username').value, document.getElementById('password').value);
        });
        document.getElementById('signupForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const p = document.getElementById('regPassword').value;
            const pc = document.getElementById('regConfirmPassword').value;
            if(p !== pc) return showToast("Passwords do not match", 'error');
            register(document.getElementById('regName').value, document.getElementById('regUsername').value, p);
        });
        document.getElementById('appointmentForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                student: state.user.name,
                date: document.getElementById('appointmentDate').value,
                purpose: document.getElementById('appointmentPurpose').value,
                book: state.pendingBorrowBook ? state.pendingBorrowBook.title : null,
                book_id: state.pendingBorrowBook ? state.pendingBorrowBook.id : null
            };
            await fetch('api.php?action=create_appointment', { method: 'POST', body: JSON.stringify(payload) });
            showToast("Appointment Scheduled!");
            state.pendingBorrowBook = null;
            els.modals.appoint.classList.add('hidden');
            els.modals.appoint.classList.remove('flex');
            fetchBooks();
        });

        document.getElementById('newImage').addEventListener('change', function() {
            const fileNameDisplay = document.getElementById('fileNameDisplay');
            if (this.files && this.files.length > 0) {
                fileNameDisplay.textContent = "Selected: " + this.files[0].name;
                fileNameDisplay.classList.remove('hidden');
            } else {
                fileNameDisplay.classList.add('hidden');
            }
        });

        document.getElementById('addBookForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData();
            formData.append('title', document.getElementById('newTitle').value);
            formData.append('author', document.getElementById('newAuthor').value);
            formData.append('category', document.getElementById('newCategory').value);
            const fileInput = document.getElementById('newImage');
            if(fileInput.files[0]) formData.append('image', fileInput.files[0]);
            await fetch('api.php?action=add_book', { method: 'POST', body: formData });
            showToast("Book Added!");
            els.modals.addBook.classList.add('hidden');
            els.modals.addBook.classList.remove('flex');
            document.getElementById('addBookForm').reset();
            document.getElementById('fileNameDisplay').classList.add('hidden');
            fetchBooks();
        });

        document.getElementById('addAnnouncementBtn').addEventListener('click', () => {
             els.modals.addNews.classList.remove('hidden'); els.modals.addNews.classList.add('flex');
        });
        
        document.getElementById('addAnnouncementForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                title: document.getElementById('newsTitle').value,
                type: document.getElementById('newsType').value,
                date: document.getElementById('newsDate').value,
                content: document.getElementById('newsContent').value
            };
            await fetch('api.php?action=add_announcement', { method: 'POST', body: JSON.stringify(payload) });
            showToast("Announcement Posted!");
            els.modals.addNews.classList.add('hidden');
            els.modals.addNews.classList.remove('flex');
            document.getElementById('addAnnouncementForm').reset();
            fetchAnnouncements();
        });

        // Feedback Logic
        document.querySelectorAll('.star-input').forEach(star => {
            star.addEventListener('click', (e) => {
                const val = parseInt(e.target.dataset.value);
                document.getElementById('selectedRating').value = val;
                
                document.querySelectorAll('.star-input').forEach(s => {
                    const sVal = parseInt(s.dataset.value);
                    if(sVal <= val) {
                        s.classList.remove('text-gray-300');
                        s.classList.add('text-yellow-400');
                    } else {
                        s.classList.add('text-gray-300');
                        s.classList.remove('text-yellow-400');
                    }
                });
            });
        });

        document.getElementById('feedbackForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                id: document.getElementById('feedbackApptId').value,
                book_title: document.getElementById('feedbackBookTitle').textContent,
                rating: document.getElementById('selectedRating').value,
                feedback: document.getElementById('feedbackText').value
            };
            
            await fetch('api.php?action=submit_feedback', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            
            showToast("Review Submitted!");
            els.modals.feedback.classList.add('hidden');
            els.modals.feedback.classList.remove('flex');
            renderStudentTable(); 
            fetchBooks(); 
        });

        function resetTabs() {
            ['tabBooksBtn', 'tabUsersBtn', 'tabApptBtn', 'tabNewsBtn'].forEach(id => {
                document.getElementById(id).classList.remove('text-brand-600', 'border-brand-600');
                document.getElementById(id).classList.add('text-gray-500', 'border-transparent');
            });
            ['adminBooksTab', 'adminUsersTab', 'adminApptTab', 'adminNewsTab'].forEach(id => document.getElementById(id).classList.add('hidden'));
        }
        document.getElementById('tabBooksBtn').addEventListener('click', (e) => {
             resetTabs(); document.getElementById('adminBooksTab').classList.remove('hidden');
             e.target.classList.add('text-brand-600', 'border-brand-600'); e.target.classList.remove('text-gray-500');
        });
        document.getElementById('tabUsersBtn').addEventListener('click', (e) => {
             resetTabs(); document.getElementById('adminUsersTab').classList.remove('hidden');
             e.target.classList.add('text-brand-600', 'border-brand-600'); e.target.classList.remove('text-gray-500');
        });
        document.getElementById('tabApptBtn').addEventListener('click', (e) => {
             resetTabs(); document.getElementById('adminApptTab').classList.remove('hidden');
             e.target.classList.add('text-brand-600', 'border-brand-600'); e.target.classList.remove('text-gray-500');
        });
        document.getElementById('tabNewsBtn').addEventListener('click', (e) => {
             resetTabs(); document.getElementById('adminNewsTab').classList.remove('hidden');
             e.target.classList.add('text-brand-600', 'border-brand-600'); e.target.classList.remove('text-gray-500');
        });

        document.getElementById('addBookBtn').addEventListener('click', () => {
             els.modals.addBook.classList.remove('hidden'); els.modals.addBook.classList.add('flex');
        });
        
        document.getElementById('actionBorrow').addEventListener('click', () => {
            showHome();
        });
        document.getElementById('actionAppointment').addEventListener('click', () => {
             state.pendingBorrowBook = null;
             document.getElementById('bookFieldContainer').classList.add('hidden');
             document.getElementById('appointmentPurpose').value = 'Book Return';
             els.modals.appoint.classList.remove('hidden');
             els.modals.appoint.classList.add('flex');
        });
    }

    function initCarousel() {
        const slides = [
            { img: 'https://images.unsplash.com/photo-1507842217153-e21f40657273?q=80&w=1920&auto=format&fit=crop' },
            { img: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=1920&auto=format&fit=crop' },
            { img: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=1920&auto=format&fit=crop' }
        ];
        const track = document.getElementById('heroTrack');
        track.innerHTML = slides.map(s => `<div class="w-full flex-shrink-0 h-full bg-cover bg-center" style="background-image: url('${s.img}')"></div>`).join('');
        let currentSlide = 0;
        const updateSlide = () => { track.style.transform = `translateX(-${currentSlide * 100}%)`; };
        document.getElementById('nextSlide').addEventListener('click', () => { currentSlide = (currentSlide + 1) % slides.length; updateSlide(); });
        document.getElementById('prevSlide').addEventListener('click', () => { currentSlide = (currentSlide - 1 + slides.length) % slides.length; updateSlide(); });
        setInterval(() => { currentSlide = (currentSlide + 1) % slides.length; updateSlide(); }, 5000);
    }

    function showToast(msg, type = 'success') {
        const box = document.getElementById('toastBox');
        const el = document.createElement('div');
        const color = type === 'success' ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-red-500 text-white';
        el.className = `${color} px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 animate-slide-in transition-all`;
        el.innerHTML = `<span class="font-semibold">${msg}</span>`;
        box.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    }
    
    init();
});