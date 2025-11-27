// script.js
class UserManager {
    constructor() {
        this.API_URL = 'http://localhost:3001';
        this.isEditing = false;
        this.currentUserId = null;
        
        this.initializeElements();
        this.attachEventListeners();
        this.checkAPIStatus();
        this.loadUsers();
    }

    initializeElements() {
        // Form elements
        this.userForm = document.getElementById('userForm');
        this.userIdInput = document.getElementById('userId');
        this.nomeInput = document.getElementById('nome');
        this.emailInput = document.getElementById('email');
        this.btnSubmit = document.getElementById('btnSubmit');
        this.btnCancel = document.getElementById('btnCancel');
        
        // Message elements
        this.messageDiv = document.getElementById('message');
        this.nomeError = document.getElementById('nomeError');
        this.emailError = document.getElementById('emailError');
        
        // Users list elements
        this.usersList = document.getElementById('usersList');
        this.loadingDiv = document.getElementById('loading');
        this.emptyState = document.getElementById('emptyState');
        this.usersCount = document.getElementById('usersCount');
        
        // Status elements
        this.apiStatus = document.getElementById('apiStatus');
        this.dbStatus = document.getElementById('dbStatus');
        
        // Modal elements
        this.modal = document.getElementById('confirmModal');
        this.confirmMessage = document.getElementById('confirmMessage');
        this.confirmCancel = document.getElementById('confirmCancel');
        this.confirmDelete = document.getElementById('confirmDelete');
        
        this.pendingDeleteId = null;
    }

    attachEventListeners() {
        this.userForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        this.btnCancel.addEventListener('click', () => this.cancelEdit());
        
        // Modal events
        this.confirmCancel.addEventListener('click', () => this.closeModal());
        this.confirmDelete.addEventListener('click', () => this.confirmDeleteUser());
        
        // Close modal when clicking outside
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });
        
        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.style.display === 'block') {
                this.closeModal();
            }
        });
    }

    async checkAPIStatus() {
        try {
            const response = await fetch(`${this.API_URL}/health`);
            const data = await response.json();
            
            this.updateStatusIndicator(this.apiStatus, response.ok, 'API');
            this.updateStatusIndicator(this.dbStatus, data.database === 'Conectado', 'Banco de Dados');
            
        } catch (error) {
            this.updateStatusIndicator(this.apiStatus, false, 'API');
            this.updateStatusIndicator(this.dbStatus, false, 'Banco de Dados');
            console.error('Erro ao verificar status da API:', error);
        }
    }

    updateStatusIndicator(element, isConnected, serviceName) {
        const dot = element.querySelector('.status-dot');
        const text = element.querySelector('.status-text');
        
        if (isConnected) {
            dot.className = 'status-dot connected';
            text.textContent = `${serviceName}: Conectado`;
            element.style.background = 'rgba(46, 204, 113, 0.2)';
        } else {
            dot.className = 'status-dot error';
            text.textContent = `${serviceName}: Erro`;
            element.style.background = 'rgba(231, 76, 60, 0.2)';
        }
    }

    showMessage(message, type = 'success') {
        this.messageDiv.textContent = message;
        this.messageDiv.className = `message ${type}`;
        
        // Auto-hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                this.hideMessage();
            }, 5000);
        }
    }

    hideMessage() {
        this.messageDiv.style.display = 'none';
    }

    clearErrors() {
        this.nomeError.textContent = '';
        this.emailError.textContent = '';
        this.nomeInput.classList.remove('error');
        this.emailInput.classList.remove('error');
    }

    showError(field, message) {
        const errorElement = document.getElementById(`${field}Error`);
        const inputElement = document.getElementById(field);
        
        errorElement.textContent = message;
        inputElement.classList.add('error');
    }

    async loadUsers() {
        this.showLoading(true);
        
        try {
            const response = await fetch(`${this.API_URL}/usuarios`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.displayUsers(data.data);
                this.updateUsersCount(data.total);
            } else {
                throw new Error(data.message);
            }
            
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
            this.showMessage(`Erro ao carregar usuários: ${error.message}`, 'error');
            this.displayUsers([]);
        } finally {
            this.showLoading(false);
        }
    }

    displayUsers(users) {
        if (users.length === 0) {
            this.usersList.style.display = 'none';
            this.emptyState.style.display = 'block';
            return;
        }

        this.emptyState.style.display = 'none';
        this.usersList.style.display = 'grid';
        
        this.usersList.innerHTML = users.map(user => `
            <div class="user-card" data-user-id="${user.id}">
                <div class="user-header">
                    <div class="user-name">${this.escapeHtml(user.nome)}</div>
                    <div class="user-id">ID: ${user.id}</div>
                </div>
                <div class="user-email">
                    <span>📧</span>
                    ${this.escapeHtml(user.email)}
                </div>
                <div class="user-actions">
                    <button class="btn btn-warning" onclick="userManager.editUser(${user.id}, '${this.escapeHtml(user.nome)}', '${this.escapeHtml(user.email)}')">
                        <span class="btn-icon">✏️</span>
                        Editar
                    </button>
                    <button class="btn btn-danger" onclick="userManager.deleteUser(${user.id}, '${this.escapeHtml(user.nome)}')">
                        <span class="btn-icon">🗑️</span>
                        Excluir
                    </button>
                </div>
            </div>
        `).join('');
    }

    updateUsersCount(count) {
        this.usersCount.textContent = count;
    }

    showLoading(show) {
        this.loadingDiv.style.display = show ? 'flex' : 'none';
    }

    async handleFormSubmit(event) {
        event.preventDefault();
        
        const userId = this.userIdInput.value;
        const nome = this.nomeInput.value.trim();
        const email = this.emailInput.value.trim().toLowerCase();

        // Clear previous errors
        this.clearErrors();

        // Validation
        let isValid = true;

        if (!nome || nome.length < 2) {
            this.showError('nome', 'Nome deve ter pelo menos 2 caracteres');
            isValid = false;
        }

        if (!email) {
            this.showError('email', 'Email é obrigatório');
            isValid = false;
        } else if (!this.isValidEmail(email)) {
            this.showError('email', 'Email deve ser válido');
            isValid = false;
        }

        if (!isValid) {
            this.showMessage('Por favor, corrija os erros no formulário', 'error');
            return;
        }

        const userData = { nome, email };

        try {
            let response;
            let url = this.API_URL + '/usuarios';
            let method = 'POST';

            if (this.isEditing) {
                url += `/${userId}`;
                method = 'PUT';
            }

            response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || `Erro ${response.status}`);
            }

            if (result.success) {
                this.showMessage(
                    this.isEditing ? '✅ Usuário atualizado com sucesso!' : '✅ Usuário criado com sucesso!'
                );
                this.clearForm();
                this.loadUsers();
            } else {
                throw new Error(result.message);
            }
            
        } catch (error) {
            console.error('Erro ao salvar usuário:', error);
            
            if (error.message.includes('Email já cadastrado') || error.message.includes('Email já está em uso')) {
                this.showError('email', 'Este email já está cadastrado');
                this.showMessage('Email já está em uso por outro usuário', 'error');
            } else {
                this.showMessage(`Erro: ${error.message}`, 'error');
            }
        }
    }

    editUser(id, nome, email) {
        this.userIdInput.value = id;
        this.nomeInput.value = nome;
        this.emailInput.value = email;
        
        this.isEditing = true;
        this.currentUserId = id;
        
        this.btnSubmit.innerHTML = '<span class="btn-icon">💾</span><span class="btn-text">Atualizar Usuário</span>';
        this.btnCancel.style.display = 'flex';
        
        this.showMessage(`Editando usuário: ${nome}`, 'warning');
        
        // Scroll to form
        this.nomeInput.focus();
    }

    cancelEdit() {
        this.clearForm();
        this.showMessage('Edição cancelada', 'warning');
    }

    clearForm() {
        this.userForm.reset();
        this.userIdInput.value = '';
        this.isEditing = false;
        this.currentUserId = null;
        
        this.btnSubmit.innerHTML = '<span class="btn-icon">➕</span><span class="btn-text">Criar Usuário</span>';
        this.btnCancel.style.display = 'none';
        
        this.clearErrors();
        this.hideMessage();
    }

    deleteUser(id, userName) {
        this.pendingDeleteId = id;
        this.confirmMessage.textContent = `Tem certeza que deseja excluir o usuário "${userName}"? Esta ação não pode ser desfeita.`;
        this.showModal();
    }

    async confirmDeleteUser() {
        if (!this.pendingDeleteId) return;

        try {
            const response = await fetch(`${this.API_URL}/usuarios/${this.pendingDeleteId}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || `Erro ${response.status}`);
            }

            if (result.success) {
                this.showMessage('✅ Usuário excluído com sucesso!');
                this.loadUsers();
            } else {
                throw new Error(result.message);
            }
            
        } catch (error) {
            console.error('Erro ao excluir usuário:', error);
            this.showMessage(`Erro ao excluir usuário: ${error.message}`, 'error');
        } finally {
            this.closeModal();
            this.pendingDeleteId = null;
        }
    }

    showModal() {
        this.modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        this.modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        this.pendingDeleteId = null;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Utility functions
function loadUsers() {
    userManager.loadUsers();
}

function clearForm() {
    userManager.clearForm();
}

// Initialize the application
let userManager;

document.addEventListener('DOMContentLoaded', () => {
    userManager = new UserManager();
    
    // Auto-refresh status every 30 seconds
    setInterval(() => {
        userManager.checkAPIStatus();
    }, 30000);
    
    // Auto-refresh users list every minute
    setInterval(() => {
        userManager.loadUsers();
    }, 60000);
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Erro global:', event.error);
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Promise rejeitada não tratada:', event.reason);
    event.preventDefault();
});