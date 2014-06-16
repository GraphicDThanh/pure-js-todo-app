/*global localStorage: false, console: false, document: false */

/*
    PLEASE NOTE: decided not to divide the code across multiple files for easier reading.
 */

(function () {
    'use strict';

    var doc = document, // Reference global object
        win = window,
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


        TodoCollection = function (sandbox) { // Collection governs the data layer.
            var todos,

                deleteTodo = function (id) {
                    if (todos[id]) {
                        todos.splice(id, 1);
                    }
                    sandbox.publish('dataChange');
                },

                updateTodo = function (args) {
                    if (args.index < 0) {
                        todos.push(args.todo);
                    } else {
                        todos[args.index] = args.todo;
                    }
                    sandbox.publish('dataChange');
                },

                saveTodo = function (todo) {
                    var todoIndex = todos.indexOf(todo);
                    updateTodo({todo: todo, index: todoIndex});
                },

                toggleTodo = function (todo) {
                    var todoIndex = todos.indexOf(todo),
                        updatedTodo = new TodoModel(todo.content, !todo.flag);
                    updateTodo({todo: updatedTodo, index: todoIndex});
                },

                reset = function () {
                    todos = [];
                    sandbox.publish('dataChange');
                },

                subComp = function (item) {
                    return item.flag === true;
                },

                removeCompleted = function () {
                    todos = todos.filter(subComp);
                    sandbox.publish('dataChange');
                },

                init = function (data) {
                    todos = data;
                    sandbox.publish('dataChange');
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
                update: updateTodo,
                toggle: toggleTodo,
                reset: reset,
                removeCompleted: removeCompleted,
                init: init
            };
        },


        TodoView = function (element, sandbox) { // View renders and updates the UI
            this.element = element;
            var $this = this,

                sum = function (a, b) {
                    return a + b;
                },

                render = function (collection) {
                    var listEl = $this.element.getElementsByTagName('ul')[0],
                        listFrag = doc.createDocumentFragment(); // Create and attach to a document partial before inserting into DOM

                    listEl.innerHTML = '';
                    listFrag.innerHTML = '';

                    for (var i = 0; i < collection.length; i++) {
                        var item = collection[i];
                        var checked = item.flag === false ? 'checked' : '';
                        var liFrag = [];
                        liFrag.push('<li class="'+ checked +'" data-todoID="'+i+'">');
                        liFrag.push('<span class="checkbox"><input type="checkbox" '+ checked +' /></span>');
                        liFrag.push('<span class="li-content text-left" title="double click to edit">'+item.content+'</span>');
                        liFrag.push('<span class="action text-right"><button class="btn-delete" data-todoID="'+i+'">x</button></span>');
                        liFrag.push('</li>');
                        listFrag.innerHTML += typeof liFrag.reduce === 'function' ? liFrag.reduce(sum) : liFrag[0] + liFrag[1] +liFrag[2] +liFrag[3] +liFrag[4];
                    }

                    listEl.innerHTML = listFrag.innerHTML; // Insert into DOM only once per render
                },

                escapeHTML = function(content) { // Use this to remove HTML tags from input
                    var regex = /((<)|(>))/ig;
                    return content.replace(regex, "");
                },

                restoreTodo = function(input, index) {
                    var editedTodo = new TodoModel(escapeHTML(input.value), true);
                    sandbox.publish('todoEdit', {todo: editedTodo, index: index});
                },

                addTodo = function() {
                    var content = doc.getElementById('todoAdd-content').value;
                    doc.getElementById('todoAdd-content').value = '';
                    if (content.length > 0) {
                        sandbox.publish('todoAdd', new TodoModel(escapeHTML(content), true));
                    }
                },

                singleClickActions = function (e) {
                    var el = e.target,
                    todoId = el.parentNode.parentNode.getAttribute('data-todoID');

                    if (el) {
                        if (el.className.indexOf('delete') > -1) { // single click actions on wrapper
                            sandbox.publish('todoRemove', todoId);
                        }
                        if (el.type === 'checkbox') {
                            sandbox.publish('toggleState', todoId);
                        }
                        if (el.id === 'todoAdd') {
                            addTodo();
                        }
                        if (el.id === 'resetList') {
                            sandbox.publish('resetTodos');
                        }
                        if (el.id == 'removeCompleted') {
                            sandbox.publish('removeCompleted');
                        }
                    }
                },

                dblClickActions = function(e) {
                    var el = e.target;

                    if (el.className.indexOf('li-content') > -1) {
                        if (el.getElementsByTagName('input')[0]) {return};
                        var id = el.parentNode.getAttribute('data-todoID'),
                            currContent = el.innerHTML;

                        el.innerHTML = '<input type="text" class="input-regular" value="'+currContent+'" />';
                        var input = el.getElementsByTagName('input')[0];
                        input.focus();

                        input.addEventListener("blur", function() {
                            restoreTodo(input, id);
                        });
                        input.addEventListener("keydown", function(e) {
                            if (e.keyCode === 13) {
                                restoreTodo(input, id);
                            }
                        });
                    }
                },

                keyDownActions = function(e) {
                    if (e.target.id === 'todoAdd-content' && e.keyCode === 13) {
                        addTodo();
                    }
                },

                bindActions = function() {
                    $this.element.addEventListener('click', function (e) {  // Delegate the events so we do not have to reattach on updates
                        singleClickActions(e);
                    });
                    $this.element.addEventListener('dblclick', function (e) { // edit on double click
                        dblClickActions(e);
                    });
                    $this.element.addEventListener('keydown', function (e) { // add todo on pressing enter
                        keyDownActions(e);
                    });
                };

            bindActions();
            return {
                render: render
            };
        },


        TodoSandbox = function() { // This is a sandbox for the application, which takes form of a simple publish / subscribe pattern
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
                            if (typeof subscribers[i].args === 'function') {
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
    var todoSandbox = new TodoSandbox(),
        todoView = new TodoView(doc.getElementById('listWrapper'), todoSandbox),
        todoCollection = new TodoCollection(todoSandbox),
        serviceLocalStorage = new ServiceLocalStorage('todos');



    // General purpose subscriptions
    todoSandbox.subscribe('init', todoCollection, todoCollection.init, serviceLocalStorage.get);
    todoSandbox.subscribe('dataChange', serviceLocalStorage, serviceLocalStorage.set, todoCollection.getItems);
    todoSandbox.subscribe('dataChange', todoView, todoView.render, todoCollection.getItems);
    // Subscriptions for mutating items
    todoSandbox.subscribe('toggleState', todoCollection, todoCollection.toggle, function(args) {
        return todoCollection.getItem(args);
    });
    todoSandbox.subscribe('todoRemove', todoCollection, todoCollection.deleteItem);
    todoSandbox.subscribe('todoAdd', todoCollection, todoCollection.save);
    todoSandbox.subscribe('todoEdit', todoCollection, todoCollection.update);
    todoSandbox.subscribe('resetTodos', todoCollection, todoCollection.reset);
    todoSandbox.subscribe('removeCompleted', todoCollection, todoCollection.removeCompleted);



    //Kick off the app
    todoSandbox.publish('init');

})();
