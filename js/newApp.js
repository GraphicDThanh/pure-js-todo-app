/*global localStorage: false, console: false, document: false */

(function () {
    'use strict';

    var ServiceLocalStorage = function (queryName) { // Services for local storage. Easily replaced with custom service.
            function get() {
                return JSON.parse(localStorage.getItem(queryName)) || [];
            }

            function set(value) {
                localStorage.setItem(queryName, JSON.stringify(value));
            }

            return {
                get: get,
                set: set
            };
        },

        TodoCollection = function () { // Collection governs the data layer.
            var todos;

            function deleteTodo(id) {
                if (todos[id]) {
                    todos.splice(id, 1);
                }
            }

            function saveTodo(todo) {
                var todoIndex = todos.indexOf(todo);
                if (todoIndex < 0) {
                    todos.push(todo);
                } else {
                    todos[todoIndex] = todo;
                }
            }

            function init(data) {
                todos = data;
            }

            function getTodos() {
                return todos;
            }

            function getTodo(id) {
                return todos[id] || {};
            }

            return {
                delete: deleteTodo,
                getItems: getTodos,
                getItem: getTodo,
                save: saveTodo,
                init: init
            };
        },


        TodoView = function (element) { // View renders and updates the UI
            var $this = this;
            this.element = element;

            function render(collection) {
                $this.element.innerHTML = '';
                var listFrag = document.createDocumentFragment();
                listFrag.innerHTML = '';

                function sum(a, b) {
                    return a + b;
                }

                for (var i = 0; i < collection.length; i++) {
                    var item = collection[i];
                    var checked = item.flag === false ? 'checked' : '';
                    var liFrag = [];
                    liFrag.push('<li class="'+ checked +'" data-todoID="'+i+'">');
                    liFrag.push('<span class="checkbox"><input type="checkbox" '+ checked +' /></span>');
                    liFrag.push('<span class="li-content text-left">'+item.content+'</span>');
                    liFrag.push('<span class="action text-right"><button class="btn-delete" data-todoID="'+i+'">x</button></span>');
                    liFrag.push('</li>');
                    var liSum = liFrag.reduce(sum);
                    listFrag.innerHTML += liSum;
                }

                element.innerHTML = listFrag.innerHTML;
            }

            return {
              render: render
            };
        },


        TodoController = function() { // Controller is a mediator between services, collections and views
            var modules = {};

            function register(module, type) {
               modules[type] = module;
            }

            function render () {
                modules.collection.init(modules.service.get());
                modules.view.render(modules.collection.getItems());
            }

            function deleteEvent(id) {
                modules.collection.delete(id);
                syncState();
            }

            function save(todo) {
                modules.collection.save(todo);
                syncState();
            }

            function toggle(id) {
                var todo = modules.collection.getItem(id);
                todo.flag = !todo.flag;
                modules.collection.save(todo);
                syncState();
            }

            function syncState() {
                var todos = modules.collection.getItems();
                modules.service.set(todos);
                modules.view.render(todos);
            }

            return {
                render: render,
                delete: deleteEvent,
                save: save,
                register: register,
                toggle: toggle
            };
        },


        TodoModel = function (content, flag) { // Basic Todo model
            this.content = content || '';
            this.flag = flag || true;
        },


        TodoEvents = function (element, controller) {
            element.onclick = function (e) {
                var el = e.target;
                var wrapper = el.parentNode.parentNode;
                var todoId = wrapper.dataset.todoid || null;

                if (el) {
                    if (el.classList.contains('btn-delete')) {
                        controller.delete(todoId);
                    }
                    if (el.type === 'checkbox') {
                        controller.toggle(todoId);
                    }
                    if (el.id === 'todoAdd') {
                        var content = document.getElementById('todoAdd-content').value;
                        var newTodo = new TodoModel(content);
                        controller.save(newTodo);
                    }
                }
            };
        };


    var todoController = new TodoController();
    var todoView = new TodoView(document.getElementById('todoList'));
    var todoCollection = new TodoCollection();
    var serviceLocalStorage = new ServiceLocalStorage('todos');
    var todoEvents = new TodoEvents(document.getElementById('listWrapper'), todoController);

    todoController.register(todoView, 'view');
    todoController.register(todoCollection, 'collection');
    todoController.register(serviceLocalStorage, 'service');

    todoController.render();

})();
