// Project Meiji - Native Fetch API Client (apiClient.js)
// ponytail: native fetch wrapper, session management, zero dependencies

export class ApiClient {
    constructor(baseUrl = '../api/') {
        this.baseUrl = baseUrl;
    }

    async request(action, options = {}) {
        const method = options.method || 'GET';
        const url = `${this.baseUrl}?action=${action}${options.query ? '&' + options.query : ''}`;
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        const fetchOptions = {
            method,
            headers,
            credentials: 'same-origin',
        };

        if (options.body && method !== 'GET') {
            fetchOptions.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
        }

        const res = await fetch(url, fetchOptions);
        let payload;
        try {
            payload = await res.json();
        } catch (e) {
            throw new Error(`Invalid server response (HTTP ${res.status})`);
        }

        if (!res.ok || !payload.success) {
            throw new Error(payload.error || `Request failed with HTTP ${res.status}`);
        }

        return payload.data;
    }

    // Auth Endpoints
    async getCurrentUser() {
        return this.request('current_user');
    }

    async register(username, password) {
        return this.request('register', {
            method: 'POST',
            body: { username, password }
        });
    }

    async login(username, password) {
        return this.request('login', {
            method: 'POST',
            body: { username, password }
        });
    }

    async logout() {
        return this.request('logout', { method: 'POST' });
    }

    // Multi-User City Slots
    async listSavedCities() {
        const data = await this.request('list_saved_cities');
        return data.cities || [];
    }

    async saveUserCity(cityState) {
        return this.request('save_user_city', {
            method: 'POST',
            body: cityState
        });
    }

    async loadUserCity(cityId) {
        const data = await this.request('load_user_city', {
            query: `city_id=${cityId}`
        });
        return data.city;
    }

    async deleteUserCity(cityId) {
        return this.request('delete_user_city', {
            method: 'POST',
            body: { cityId }
        });
    }

    // Backward-Compatible Single-Player Endpoints
    async getCity(id = 1) {
        return this.request('get_city', { query: `id=${id}` });
    }

    async saveGrid(payload) {
        return this.request('save_grid', {
            method: 'POST',
            body: payload
        });
    }

    async resetCity(id = 1, cityName = 'Edo-Tokyo') {
        return this.request('reset_city', {
            method: 'POST',
            query: `id=${id}`,
            body: { cityName }
        });
    }

    // ponytail: direct endpoints for Iteration 20 contracts
    async fetchDirect(endpoint, options = {}) {
        const method = options.method || 'GET';
        const url = `${this.baseUrl}${endpoint}${options.query ? '?' + options.query : ''}`;
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };
        const fetchOptions = {
            method,
            headers,
            credentials: 'same-origin',
        };
        if (options.body && method !== 'GET') {
            fetchOptions.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
        }
        const res = await fetch(url, fetchOptions);
        const rawText = await res.text();
        let payload;
        try {
            payload = JSON.parse(rawText);
        } catch (e) {
            console.error(`Invalid server JSON response from ${endpoint} (HTTP ${res.status}):\n${rawText}`);
            throw new Error(`Invalid server response (HTTP ${res.status}): ${rawText.slice(0, 100)}`);
        }
        if (!res.ok || payload.success === false) {
            throw new Error(payload.error || `Request failed with HTTP ${res.status}`);
        }
        return payload;
    }

    async sessionCheck() {
        return this.fetchDirect('session_check.php');
    }

    async devLogin(profile = 'fidel') {
        return this.fetchDirect('dev_login.php', {
            method: 'POST',
            body: { profile }
        });
    }

    async saveCity(payload) {
        return this.fetchDirect('save_city.php', {
            method: 'POST',
            body: payload
        });
    }

    async loadCity(slotId = null) {
        return this.fetchDirect('load_city.php', {
            query: slotId ? `slot_id=${slotId}` : ''
        });
    }
}