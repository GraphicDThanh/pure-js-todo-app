/*global localStorage: false, console: false, document: false */

(function () {
    'use strict';

    var doc = document,
        ServiceLocalStorage = function (queryName) {    // Services for local storage. Easily replaceable with custom service.
            var get = function () {
                    return JSON.parse(localStorage.getItem(queryName)) || [];
                },

                set = function (value) {
                    localStorage.setItem(queryName, JSON.stringify(value));
                };

            return {
                get: get,
                set: set
            };
        },


        TodoModel = function (content, flag) {      // Basic Todo model
            this.content = content || '';
            this.flag = flag || true;
        },


        TodoCollection = function () {      // Collection governs the data layer.
            var todos,

                deleteTodo = function (id) {
                    if (todos[id]) {
                        todos.splice(id, 1);
                    }
                },

                saveTodo = function (todo) {
                    var todoIndex = todos.indexOf(todo);
                    if (todoIndex < 0) {
                        todos.push(todo);
                    } else {
                        todos[todoIndex] = todo;
                    }
                },

                init = function (data) {
                    todos = data;
                },

                getTodos = function () {
                    return todos;
                },

                getTodo = function (id) {
                    return todos[id] || {};
                };

            return {
                deleteItem: deleteTodo,
                getItems: getTodos,
                getItem: getTodo,
                save: saveTodo,
                init: init,
                todos: todos
            };
        },


        TodoView = function (element) {     // View renders and updates the UI
            var $this = this,

                sum = function (a, b) {
                    return a + b;
                },

                render = function (collection) {
                    $this.element.innerHTML = '';
                    var listFrag = doc.createDocumentFragment();    // create and attach template to a document partial before inserting into DOM
                    listFrag.innerHTML = '';

                    for (var i = 0; i < collection.length; i++) {
                        var item = collection[i],
                            checked = item.flag === false ? 'checked' : '',
                            liFrag = [],
                            liSum;

                        liFrag.push('<li class="'+ checked +'" data-todoID="'+i+'">');
                        liFrag.push('<span class="checkbox"><input type="checkbox" '+ checked +' /></span>');
                        liFrag.push('<span class="li-content text-left">'+item.content+'</span>');
                        liFrag.push('<span class="action text-right"><button class="btn-delete" data-todoID="'+i+'">x</button></span>');
                        liFrag.push('</li>');
                        liSum = liFrag.reduce(sum);    // a rather rudimentary template
                        listFrag.innerHTML += liSum;
                    }

                    element.innerHTML = listFrag.innerHTML;     // insert into DOM only once per render
                };

            this.element = element;

            return {
                render: render
            };
        },


        TodoSandbox = function() {      // Sandbox for communication between view, services and collection
            var modules = {},

                register = function (module, type) {
                   modules[type] = module;
                },

                render = function () {
                    modules.collection.init(modules.service.get());
                    modules.view.render(modules.collection.getItems());
                },

                deleteItem = function (id) {
                    modules.collection.deleteItem(id);
                    syncState();
                },

                save = function (todo) {
                    modules.collection.save(todo);
                    syncState();
                },

                toggle = function (id) {
                    var todo = modules.collection.getItem(id);
                    todo.flag = !todo.flag;
                    modules.collection.save(todo);
                    syncState();
                },

                syncState = function () {   // facade for updating the display
                    var todos = modules.collection.getItems();
                    modules.service.set(todos);
                    modules.view.render(todos);
                };

            return {
                render: render,
                deleteItem: deleteItem,
                save: save,
                register: register,
                toggle: toggle,
            };
        },


        TodoEvents = function (element, controller) {   // UI events are delegated to sub-elements of the wrapper for easy reattaching
            element.onclick = function (e) {
                var el = e.target,
                    wrapper = el.parentNode.parentNode,
                    todoId = wrapper.dataset.todoid || null;

                if (el) {
                    if (el.classList.contains('btn-delete')) {
                        controller.deleteItem(todoId);
                    }
                    if (el.type === 'checkbox') {
                        controller.toggle(todoId);
                    }
                    if (el.id === 'todoAdd') {
                        var contentElement = doc.getElementById('todoAdd-content'),
                            newTodo = new TodoModel(contentElement.value);
                        controller.save(newTodo);
                        contentElement.value = '';
                    }
                }
            };
        };



    var listEl = doc.getElementById('todoList'),
        wrapperEl = doc.getElementById('listWrapper'),
        todoSandbox = new TodoSandbox(),
        todoView = new TodoView(listEl),
        todoCollection = new TodoCollection(),
        serviceLocalStorage = new ServiceLocalStorage('todos'),   // todos is simply a label by which we retrieve the data from local storage
        todoEvents = new TodoEvents(wrapperEl, todoSandbox);

    todoSandbox.register(todoView, 'view');
    todoSandbox.register(todoCollection, 'collection');
    todoSandbox.register(serviceLocalStorage, 'service');

    todoSandbox.render();


})();
