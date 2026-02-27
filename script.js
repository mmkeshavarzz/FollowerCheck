/**
 * ============================================
 *  Follow Analyzer v2.1 - Core Engine
 * ============================================
 *  تحلیلگر فالوورها و فالووینگ‌های اینستاگرام
 *
 *  ⚙️ فرمت‌های پشتیبانی‌شده:
 *   1. آرایه با string_list_data (فرمت 2023-2026)
 *   2. آبجکت با relationships_following
 *   3. آرایه ساده از آبجکت‌ها با value/username
 *
 *  📦 ذخیره‌سازی: localStorage
 *  📸 خروجی: PNG با html2canvas
 * ============================================
 */

(function () {
    'use strict';

    /* ─── State Management ─── */

    var state = {
        followers: [],      // آرایه یوزرنیم فالوورها
        following: [],      // آرایه یوزرنیم فالووینگ‌ها
        results: {
            notFollowingBack: [],
            mutual: [],
            fans: []
        },
        currentTab: 'not-following-back'
    };

    /* ─── DOM References ─── */

    var el = {};

    function _cacheDom() {
        el.followersInput   = document.getElementById('followers-input');
        el.followingInput   = document.getElementById('following-input');
        el.followersDrop    = document.getElementById('followers-drop-zone');
        el.followingDrop    = document.getElementById('following-drop-zone');
        el.followersStatus  = document.getElementById('followers-status');
        el.followingStatus  = document.getElementById('following-status');
        el.followersCard    = document.getElementById('followers-upload-card');
        el.followingCard    = document.getElementById('following-upload-card');
        el.analyzeBtn       = document.getElementById('analyze-btn');
        el.clearBtn         = document.getElementById('clear-btn');
        el.exportBtn        = document.getElementById('export-btn');
        el.demoBtn          = document.getElementById('demo-btn');
        el.resultsSection   = document.getElementById('results-section');
        el.debugSection     = document.getElementById('debug-section');
        el.debugOutput      = document.getElementById('debug-output');
        el.searchInput      = document.getElementById('search-input');
        // آمار
        el.statFollowers    = document.getElementById('stat-followers');
        el.statFollowing    = document.getElementById('stat-following');
        el.statNotBack      = document.getElementById('stat-not-back');
        el.statMutual       = document.getElementById('stat-mutual');
        el.statFans         = document.getElementById('stat-fans');
        el.statRatio        = document.getElementById('stat-ratio');
        // شمارنده تب‌ها
        el.tabCountNfb      = document.getElementById('tab-count-nfb');
        el.tabCountMutual   = document.getElementById('tab-count-mutual');
        el.tabCountFans     = document.getElementById('tab-count-fans');
        // لیست‌ها
        el.listNfb          = document.getElementById('list-not-following-back');
        el.listMutual       = document.getElementById('list-mutual');
        el.listFans         = document.getElementById('list-fans');
    }

    /* ─── Initialization ─── */

    function init() {
        _cacheDom();
        _bindEvents();
        _loadFromStorage();
        _updateUI();
    }

    /* ─── Event Binding ─── */

    function _bindEvents() {
        // آپلود فایل
        el.followersInput.addEventListener('change', function (e) {
            if (e.target.files[0]) _processFile(e.target.files[0], 'followers');
        });

        el.followingInput.addEventListener('change', function (e) {
            if (e.target.files[0]) _processFile(e.target.files[0], 'following');
        });

        // دراگ اند دراپ
        _initDropZone(el.followersDrop, 'followers');
        _initDropZone(el.followingDrop, 'following');

        // دکمه‌ها
        el.analyzeBtn.addEventListener('click', _onAnalyze);
        el.clearBtn.addEventListener('click', _onClear);
        el.exportBtn.addEventListener('click', _onExport);
        el.demoBtn.addEventListener('click', _onDemo);

        // تب‌ها
        document.querySelectorAll('.tab-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                _switchTab(this.dataset.tab);
            });
        });

        // جستجو
        el.searchInput.addEventListener('input', _onSearch);
    }

    /* ─── Drag & Drop Setup ─── */

    function _initDropZone(zone, type) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function (evt) {
            zone.addEventListener(evt, function (e) {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(function (evt) {
            zone.addEventListener(evt, function () { zone.classList.add('drag-over'); });
        });

        ['dragleave', 'drop'].forEach(function (evt) {
            zone.addEventListener(evt, function () { zone.classList.remove('drag-over'); });
        });

        zone.addEventListener('drop', function (e) {
            var file = e.dataTransfer.files[0];
            if (file) _processFile(file, type);
        });
    }

    /* ─── File Processing ─── */

    /**
     * خوندن و پارس کردن فایل JSON
     * @param {File} file
     * @param {string} type - 'followers' یا 'following'
     */
    function _processFile(file, type) {
        if (!file.name.toLowerCase().endsWith('.json')) {
            _toast('فقط فایل JSON قبوله! 🙅‍♂️', 'error');
            return;
        }

        var reader = new FileReader();

        reader.onload = function (e) {
            try {
                var raw = JSON.parse(e.target.result);

                // لاگ دیباگ: نشون بده فایل چه ساختاری داره
                _debugLog(type, raw);

                var usernames = _parseUsernames(raw);

                if (usernames.length === 0) {
                    _toast('یوزرنیمی پیدا نشد! فرمت فایل رو چک کن 🤔', 'error');
                    return;
                }

                // ذخیره
                state[type] = usernames;
                _saveToStorage(type, usernames);
                _setFileLoaded(type, file.name, usernames.length);
                _updateUI();

                _toast(
                    (type === 'followers' ? '👥 فالوورها: ' : '👤 فالووینگ‌ها: ') +
                    usernames.length + ' نفر لود شد!',
                    'success'
                );

            } catch (err) {
                console.error('[FollowAnalyzer] JSON parse error:', err);
                _toast('فایل JSON معتبر نیست! 😵 ' + err.message, 'error');
            }
        };

        reader.onerror = function () {
            _toast('خطا در خوندن فایل 😢', 'error');
        };

        reader.readAsText(file);
    }

    /* ─── JSON Parser (قلب برنامه!) ─── */

    /**
     * استخراج یوزرنیم‌ها از هر فرمت JSON اینستاگرام
     *
     * فرمت 1 (followers_1.json - آرایه):
     * [
     *   { "string_list_data": [{ "value": "username", "href": "...", "timestamp": 123 }] },
     *   ...
     * ]
     *
     * فرمت 2 (following.json - آبجکت):
     * {
     *   "relationships_following": [
     *     { "string_list_data": [{ "value": "username", "href": "...", "timestamp": 123 }] },
     *     ...
     *   ]
     * }
     *
     * @param {*} data - داده خام JSON
     * @returns {string[]} آرایه یوزرنیم‌های یونیک
     */
    function _parseUsernames(data) {
        var results = [];

        // ─── مرحله 1: پیدا کردن آرایه اصلی ───
        var items = _findArray(data);

        if (!items || items.length === 0) {
            console.warn('[FollowAnalyzer] هیچ آرایه‌ای پیدا نشد');
            return [];
        }

        console.log('[FollowAnalyzer] تعداد آیتم‌ها پیدا شده:', items.length);

        // ─── مرحله 2: استخراج یوزرنیم از هر آیتم ───
        for (var i = 0; i < items.length; i++) {
            var username = _extractUsername(items[i]);
            if (username) {
                results.push(username);
            }
        }

        // حذف تکراری‌ها
        return _unique(results);
    }

    /**
     * پیدا کردن آرایه اصلی از داده JSON
     * مهم نیست فرمت چیه، آرایه رو پیدا میکنه
     *
     * @param {*} data
     * @returns {Array|null}
     */
    function _findArray(data) {
        // اگه خودش آرایه‌ست
        if (Array.isArray(data)) {
            return data;
        }

        // اگه آبجکته، بگرد دنبال آرایه
        if (data && typeof data === 'object') {
            // اول بگرد دنبال کلیدهای معروف
            var knownKeys = [
                'relationships_following',
                'relationships_followers',
                'followers',
                'following'
            ];

            for (var k = 0; k < knownKeys.length; k++) {
                if (Array.isArray(data[knownKeys[k]])) {
                    return data[knownKeys[k]];
                }
            }

            // اگه پیدا نشد، اولین آرایه‌ای که هست رو برگردون
            var keys = Object.keys(data);
            for (var j = 0; j < keys.length; j++) {
                if (Array.isArray(data[keys[j]])) {
                    return data[keys[j]];
                }
            }
        }

        return null;
    }

    /**
     * استخراج یوزرنیم از یک آیتم منفرد
     * چندین ساختار مختلف رو چک میکنه
     *
     * @param {*} item
     * @returns {string|null}
     */
    function _extractUsername(item) {
        if (!item || typeof item !== 'object') return null;

        // ── روش 1: string_list_data (رایج‌ترین - 2023 تا 2026) ──
        if (item.string_list_data && Array.isArray(item.string_list_data)) {
            for (var i = 0; i < item.string_list_data.length; i++) {
                var entry = item.string_list_data[i];
                if (entry && typeof entry.value === 'string' && entry.value.trim() !== '') {
                    return entry.value.toLowerCase().trim();
                }
            }
            // اگه value نبود از href استخراج کن
            for (var h = 0; h < item.string_list_data.length; h++) {
                var href = item.string_list_data[h] && item.string_list_data[h].href;
                if (href) {
                    var extracted = _usernameFromUrl(href);
                    if (extracted) return extracted;
                }
            }
        }

        // ── روش 2: فیلد مستقیم value ──
        if (typeof item.value === 'string' && item.value.trim() !== '') {
            return item.value.toLowerCase().trim();
        }

        // ── روش 3: فیلد username ──
        if (typeof item.username === 'string' && item.username.trim() !== '') {
            return item.username.toLowerCase().trim();
        }

        // ── روش 4: فیلد name ──
        if (typeof item.name === 'string' && item.name.trim() !== '') {
            return item.name.toLowerCase().trim();
        }

        // ── روش 5: فیلد title (بعضی نسخه‌ها) ──
        if (typeof item.title === 'string' && item.title.trim() !== '') {
            return item.title.toLowerCase().trim();
        }

        // ── روش 6: href مستقیم ──
        if (typeof item.href === 'string') {
            return _usernameFromUrl(item.href);
        }

        return null;
    }

    /**
     * استخراج یوزرنیم از URL اینستاگرام
     * @param {string} url
     * @returns {string|null}
     */
    function _usernameFromUrl(url) {
        if (!url) return null;
        var match = url.match(/instagram\.com\/([A-Za-z0-9_.]+)/);
        return match ? match[1].toLowerCase().trim() : null;
    }

    /* ─── Analysis Engine ─── */

    function _onAnalyze() {
        if (state.followers.length === 0 || state.following.length === 0) {
            _toast('اول هر دو فایل رو آپلود کن! 📁', 'error');
            return;
        }

        _showLoading('در حال تحلیل... 🔍');

        setTimeout(function () {
            _doAnalysis();
            _displayResults();
            _hideLoading();
            _toast('تحلیل انجام شد! ببین کیا بی‌معرفتن 😈', 'success');
        }, 600);
    }

    /**
     * محاسبه اصلی:
     *
     * 💔 فالوبک نکرده = فالووینگ - فالوور
     *    (کسایی که فالوشون کردی ولی اونا فالوت نکردن)
     *
     * 🤝 دوطرفه = فالووینگ ∩ فالوور
     *    (هم فالو کردی هم فالوت کرده)
     *
     * 🌟 فن‌ها = فالوور - فالووینگ
     *    (فالوت کرده ولی تو فالوش نکردی)
     */
    function _doAnalysis() {
        // استفاده از Set برای performance بالا - O(1) lookup
        var followersSet = new Set(state.followers);
        var followingSet = new Set(state.following);

        // 💔 فالوبک نکرده: توی following هست ولی توی followers نیست
        state.results.notFollowingBack = state.following.filter(function (user) {
            return !followersSet.has(user);
        }).sort();

        // 🤝 دوطرفه: هم توی following هم توی followers
        state.results.mutual = state.following.filter(function (user) {
            return followersSet.has(user);
        }).sort();

        // 🌟 فن‌ها: توی followers هست ولی توی following نیست
        state.results.fans = state.followers.filter(function (user) {
            return !followingSet.has(user);
        }).sort();

        // لاگ نتایج
        console.log('[FollowAnalyzer] نتایج تحلیل:');
        console.log('  فالوورها:', state.followers.length);
        console.log('  فالووینگ‌ها:', state.following.length);
        console.log('  فالوبک نکرده:', state.results.notFollowingBack.length);
        console.log('  دوطرفه:', state.results.mutual.length);
        console.log('  فن‌ها:', state.results.fans.length);

        // ذخیره نتایج
        _saveToStorage('results', state.results);
    }

    /* ─── Display Results ─── */

    function _displayResults() {
        el.resultsSection.style.display = 'block';

        var fwrCount = state.followers.length;
        var fwnCount = state.following.length;
        var nfbCount = state.results.notFollowingBack.length;
        var mutCount = state.results.mutual.length;
        var fanCount = state.results.fans.length;
        var ratio    = fwnCount > 0 ? Math.round((mutCount / fwnCount) * 100) : 0;

        // انیمیشن اعداد
        _countUp(el.statFollowers, fwrCount);
        _countUp(el.statFollowing, fwnCount);
        _countUp(el.statNotBack, nfbCount);
        _countUp(el.statMutual, mutCount);
        _countUp(el.statFans, fanCount);
        _countUp(el.statRatio, ratio, '%');

        // شمارنده تب‌ها
        el.tabCountNfb.textContent = nfbCount;
        el.tabCountMutual.textContent = mutCount;
        el.tabCountFans.textContent = fanCount;

        // رندر لیست‌ها
        _renderUserList(el.listNfb, state.results.notFollowingBack);
        _renderUserList(el.listMutual, state.results.mutual);
        _renderUserList(el.listFans, state.results.fans);

        // فعال کردن خروجی
        el.exportBtn.disabled = false;

        // اسکرول
        setTimeout(function () {
            el.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
    }

    /**
     * رندر لیست کاربرها در DOM
     * @param {HTMLElement} container
     * @param {string[]} users
     */
    function _renderUserList(container, users) {
        container.innerHTML = '';

        if (users.length === 0) {
            container.innerHTML =
                '<div class="empty-message">' +
                '<span class="empty-icon">🎉</span>' +
                '<p>لیست خالیه! چه خبر خوبی</p>' +
                '</div>';
            return;
        }

        var frag = document.createDocumentFragment();

        for (var i = 0; i < users.length; i++) {
            var user = users[i];
            var div = document.createElement('div');
            div.className = 'user-item';
            div.setAttribute('data-username', user);

            var avatarNum = (user.charCodeAt(0) % 6) + 1;
            var initial = user.charAt(0).toUpperCase();

            div.innerHTML =
                '<div class="user-info">' +
                    '<div class="user-avatar avatar-' + avatarNum + '">' + _esc(initial) + '</div>' +
                    '<div>' +
                        '<div class="user-name">@' + _esc(user) + '</div>' +
                        '<a href="https://instagram.com/' + _esc(user) + '" target="_blank" rel="noopener" class="insta-link">↗ instagram.com/' + _esc(user) + '</a>' +
                    '</div>' +
                '</div>' +
                '<span class="user-index">#' + (i + 1) + '</span>';

            frag.appendChild(div);
        }

        container.appendChild(frag);
    }

    /* ─── Count Up Animation ─── */

    function _countUp(element, target, suffix) {
        suffix = suffix || '';
        var duration = 1000;
        var fps = 60;
        var steps = Math.ceil(duration / (1000 / fps));
        var step = target / steps;
        var current = 0;
        var count = 0;

        var timer = setInterval(function () {
            count++;
            current += step;
            if (count >= steps) {
                current = target;
                clearInterval(timer);
            }
            element.textContent = Math.round(current) + suffix;
        }, 1000 / fps);
    }

    /* ─── Tab Switching ─── */

    function _switchTab(tabId) {
        state.currentTab = tabId;

        document.querySelectorAll('.tab-btn').forEach(function (btn) {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });

        document.querySelectorAll('.tab-content').forEach(function (tc) {
            tc.classList.toggle('active', tc.id === 'tab-' + tabId);
        });

        el.searchInput.value = '';
        _onSearch();
    }

    /* ─── Search ─── */

    function _onSearch() {
        var q = el.searchInput.value.toLowerCase().trim();
        var activeContent = document.querySelector('.tab-content.active');
        if (!activeContent) return;

        var items = activeContent.querySelectorAll('.user-item');
        items.forEach(function (item) {
            var username = item.getAttribute('data-username') || '';
            item.style.display = username.indexOf(q) !== -1 ? '' : 'none';
        });
    }

    /* ─── Demo Data Generator ─── */

    function _onDemo() {
        // ساخت داده تستی با فرمت واقعی اینستاگرام
        var sampleFollowers = [
            'ali_dev', 'sara_design', 'reza_code', 'mina_art',
            'hossein_js', 'nazanin_ui', 'mehdi_php', 'fatemeh_css',
            'amir_react', 'zahra_vue', 'fan_only_1', 'fan_only_2',
            'fan_only_3'
        ];

        var sampleFollowing = [
            'ali_dev', 'sara_design', 'reza_code', 'mina_art',
            'hossein_js', 'nazanin_ui', 'mehdi_php', 'fatemeh_css',
            'unfollower_1', 'unfollower_2', 'unfollower_3',
            'unfollower_4', 'unfollower_5'
        ];

        state.followers = sampleFollowers;
        state.following = sampleFollowing;

        _saveToStorage('followers', sampleFollowers);
        _saveToStorage('following', sampleFollowing);

        _setFileLoaded('followers', 'داده تستی', sampleFollowers.length);
        _setFileLoaded('following', 'داده تستی', sampleFollowing.length);

        _updateUI();
        _toast('داده تستی ساخته شد! حالا دکمه تحلیل رو بزن 🎲', 'info');
    }

    /* ─── Export PNG ─── */

    function _onExport() {
        if (typeof html2canvas === 'undefined') {
            _toast('html2canvas لود نشده! 😕', 'error');
            return;
        }

        _showLoading('در حال ساخت تصویر... 📸');

        setTimeout(function () {
            html2canvas(el.resultsSection, {
                backgroundColor: '#F8F6F2',
                scale: 2,
                useCORS: true,
                logging: false
            }).then(function (canvas) {
                _hideLoading();
                var link = document.createElement('a');
                link.download = 'follow-analysis-' + _dateStr() + '.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
                _toast('تصویر ذخیره شد! 🎉', 'success');
            }).catch(function (err) {
                _hideLoading();
                console.error('Export error:', err);
                _toast('خطا در ساخت تصویر! 😵', 'error');
            });
        }, 300);
    }

    /* ─── Clear All ─── */

    function _onClear() {
        state.followers = [];
        state.following = [];
        state.results = { notFollowingBack: [], mutual: [], fans: [] };

        localStorage.removeItem('fa_followers');
        localStorage.removeItem('fa_following');
        localStorage.removeItem('fa_results');

        ['followers', 'following'].forEach(function (type) {
            var statusEl = type === 'followers' ? el.followersStatus : el.followingStatus;
            var cardEl = type === 'followers' ? el.followersCard : el.followingCard;
            statusEl.classList.remove('loaded');
            statusEl.querySelector('.status-text').textContent = 'هنوز فایلی انتخاب نشده';
            cardEl.classList.remove('loaded');
        });

        el.followersInput.value = '';
        el.followingInput.value = '';
        el.resultsSection.style.display = 'none';
        el.debugSection.style.display = 'none';
        el.searchInput.value = '';

        _updateUI();
        _toast('همه چی پاک شد! 🧹', 'info');
    }

    /* ─── UI State Updates ─── */

    function _updateUI() {
        var bothLoaded = state.followers.length > 0 && state.following.length > 0;
        el.analyzeBtn.disabled = !bothLoaded;

        if (!bothLoaded) {
            el.exportBtn.disabled = true;
        }
    }

    function _setFileLoaded(type, fileName, count) {
        var statusEl = type === 'followers' ? el.followersStatus : el.followingStatus;
        var cardEl = type === 'followers' ? el.followersCard : el.followingCard;

        statusEl.classList.add('loaded');
        statusEl.querySelector('.status-text').textContent =
            '✅ ' + fileName + ' (' + count + ' نفر)';
        cardEl.classList.add('loaded');
    }

    /* ─── Storage (localStorage) ─── */

    function _saveToStorage(key, data) {
        try {
            localStorage.setItem('fa_' + key, JSON.stringify(data));
        } catch (e) {
            console.warn('[Storage] Save failed:', e);
        }
    }

    function _loadFromStorage() {
        try {
            var f = localStorage.getItem('fa_followers');
            var g = localStorage.getItem('fa_following');

            if (f) {
                state.followers = JSON.parse(f);
                _setFileLoaded('followers', 'حافظه محلی', state.followers.length);
            }

            if (g) {
                state.following = JSON.parse(g);
                _setFileLoaded('following', 'حافظه محلی', state.following.length);
            }

            // اگه هر دو بود اتوماتیک تحلیل کن
            if (state.followers.length > 0 && state.following.length > 0) {
                _doAnalysis();
                // با کمی تأخیر نتایج رو نشون بده
                setTimeout(_displayResults, 100);
            }

        } catch (e) {
            console.warn('[Storage] Load failed:', e);
        }
    }

    /* ─── Debug Logger ─── */

    function _debugLog(type, rawData) {
        // فعال کردن بخش دیباگ (برای عیب‌یابی فعال کن)
        // el.debugSection.style.display = 'block';

        var preview = {};
        preview.type = type;
        preview.isArray = Array.isArray(rawData);
        preview.topLevelKeys = Array.isArray(rawData) ? '(array)' : Object.keys(rawData);

        if (Array.isArray(rawData) && rawData.length > 0) {
            preview.firstItem = rawData[0];
            preview.totalItems = rawData.length;
        } else if (rawData && typeof rawData === 'object') {
            var keys = Object.keys(rawData);
            for (var i = 0; i < keys.length; i++) {
                if (Array.isArray(rawData[keys[i]])) {
                    preview.arrayKey = keys[i];
                    preview.arrayLength = rawData[keys[i]].length;
                    preview.firstItem = rawData[keys[i]][0];
                    break;
                }
            }
        }

        console.log('[FollowAnalyzer] Debug (' + type + '):', preview);
    }

    /* ─── UI Helpers ─── */

    function _showLoading(msg) {
        var overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.id = 'loading-overlay';
        overlay.innerHTML =
            '<div class="loading-spinner">' +
            '<div class="spinner-dots"><span></span><span></span><span></span></div>' +
            '<span class="loading-text">' + (msg || 'صبر کن...') + '</span>' +
            '</div>';
        document.body.appendChild(overlay);
    }

    function _hideLoading() {
        var ov = document.getElementById('loading-overlay');
        if (ov) {
            ov.style.opacity = '0';
            ov.style.transition = 'opacity 0.3s';
            setTimeout(function () { ov.remove(); }, 300);
        }
    }

    function _toast(msg, type) {
        var old = document.querySelector('.toast');
        if (old) old.remove();

        var t = document.createElement('div');
        t.className = 'toast ' + (type || 'info');
        t.textContent = msg;
        document.body.appendChild(t);

        requestAnimationFrame(function () {
            t.classList.add('show');
        });

        setTimeout(function () {
            t.classList.remove('show');
            setTimeout(function () { t.remove(); }, 400);
        }, 3500);
    }

    /* ─── Utility Functions ─── */

    function _unique(arr) {
        return Array.from(new Set(arr));
    }

    function _esc(str) {
        var d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    function _dateStr() {
        var n = new Date();
        return n.getFullYear() + '-' +
            String(n.getMonth() + 1).padStart(2, '0') + '-' +
            String(n.getDate()).padStart(2, '0');
    }

    /* ─── Boot ─── */
    document.addEventListener('DOMContentLoaded', init);

})();
