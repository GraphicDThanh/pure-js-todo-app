/*global localStorage: false, console: false, document: false */

(function () {
    'use strict';

    var doc = document, // reference global object
        ServiceLocalStorage = function (queryName) { // Services plugin for local storage. Easily replaceable with custom service.
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


        TodoModel = function (content, flag) { // Basic Todo model
            this.content = content || '';
            this.flag = typeof flag === 'boolean' ? flag : true;
        },


        TodoCollection = function (observer) { // Collection governs the data layer.
            var todos,

                deleteTodo = function (id) {
                    console.log('deleting' + id);
                    if (todos[id]) {
                        todos.splice(id, 1);
                    }
                    observer.publish('dataChange');
                },

                saveTodo = function (todo) {
                    var todoIndex = todos.indexOf(todo);
                    if (todoIndex < 0) {
                        todos.push(todo);
                    } else {
                        todos[todoIndex] = todo;
                    }
                    observer.publish('dataChange');
                },

                toggleTodo = function (todo) {
                    var todoIndex = todos.indexOf(todo),
                        updatedTodo = new TodoModel(todo.content, !todo.flag);
                    if (todoIndex < 0) {
                        todos.push(updatedTodo);
                    } else {
                        todos[todoIndex] = updatedTodo;
                    }
                    observer.publish('dataChange');
                },

                init = function (data) {
                    todos = data;
                    observer.publish('dataChange');
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
                toggle: toggleTodo,
                init: init
            };
        },


        TodoView = function (element, observer) { // View renders and updates the UI
            this.element = element;
            var $this = this,

                sum = function (a, b) {
                    return a + b;
                },

                render = function (collection) {
                    var listEl = $this.element.getElementsByTagName('ul')[0],
                        listFrag = doc.createDocumentFragment(); // create and attach to a document partial before inserting into DOM

                    listEl.innerHTML = '';
                    listFrag.innerHTML = '';

                    for (var i = 0; i < collection.length; i++) {
                        var item = collection[i];
                        var checked = item.flag === false ? 'checked' : '';
                        var liFrag = [];
                        liFrag.push('<li class="'+ checked +'" data-todoID="'+i+'">');
                        liFrag.push('<span class="checkbox"><input type="checkbox" '+ checked +' /></span>');
                        liFrag.push('<span class="li-content text-left">'+item.content+'</span>');
                        liFrag.push('<span class="action text-right"><button class="btn-delete" data-todoID="'+i+'">x</button></span>');
                        liFrag.push('</li>');
                        listFrag.innerHTML += liFrag.reduce(sum);
                    }

                    listEl.innerHTML = listFrag.innerHTML; // insert into DOM only once per render
                },

                bindActions = function() {
                    $this.element.onclick = function (e) { // delegate the events so we do not have to reattach on updates
                        var el = e.target,
                            wrapper = el.parentNode.parentNode,
                            todoId = wrapper.dataset.todoid;

                        if (el) {
                            if (el.classList.contains('btn-delete')) {
                                observer.publish('todoRemove', todoId);
                            }
                            if (el.type === 'checkbox') {
                                observer.publish('toggleState', todoId);
                            }
                            if (el.id === 'todoAdd') {
                                var content = doc.getElementById('todoAdd-content').value;
                                observer.publish('todoAdd', new TodoModel(content, true));
                            }
                        }
                    };
                };

            bindActions();
            return {
                render: render
            };
        },


        TodoObserver = function() { // This is a sandbox for the application, which takes form of a simple publish / subscribe pattern
            this.topics = [];
            var $this = this,
                subscribe = function(topic, module, func, args) {
                    if ($this.topics[topic]) {
                        $this.topics[topic].push({module: module, func: func, args: args});
                    } else {
                        $this.topics[topic] = new Array({module: module, func: func, args: args});
                    }
                },

                unsub = function(topic, module) {
                    var subscribers = $this.topics[topic] || [];
                    if (subscribers.length > 0) {
                        for (var i = 0; i < subscribers.length; i++) {
                            if (subscribers[i].module === module) {
                                subscribers.splice(i, 1);
                            }
                        }
                    }
                },

                publish = function(topic, args) {
                    var subscribers = $this.topics[topic] || [];
                    if (subscribers.length > 0) {
                        for (var i = 0; i < subscribers.length; i++) {
                            if (typeof subscribers[i].args == 'function') {
                                subscribers[i].func(subscribers[i].args(args));
                            } else {
                                subscribers[i].func(args);
                            }
                        }
                    }
                };

            return {
                subscribe: subscribe,
                unsub: unsub,
                publish: publish
            };
        };


    // Initialise all modules
    var todoObserver = new TodoObserver(),
        todoView = new TodoView(doc.getElementById('listWrapper'), todoObserver),
        todoCollection = new TodoCollection(todoObserver),
        serviceLocalStorage = new ServiceLocalStorage('todos');


    // Register all subscriptions
    todoObserver.subscribe('init', todoCollection, todoCollection.init, serviceLocalStorage.get);
    todoObserver.subscribe('dataChange', serviceLocalStorage, serviceLocalStorage.set, todoCollection.getItems);
    todoObserver.subscribe('dataChange', todoView, todoView.render, todoCollection.getItems);
    todoObserver.subscribe('toggleState', todoCollection, todoCollection.toggle, function(args) {
        return todoCollection.getItem(args);
    });
    todoObserver.subscribe('todoRemove', todoCollection, todoCollection.deleteItem);
    todoObserver.subscribe('todoAdd', todoCollection, todoCollection.save);


    //Kick off the app
    todoObserver.publish('init');

})();
