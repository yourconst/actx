type ChangeType = 'insert' | 'delete';

interface ChangeResult<T> {
    type: ChangeType;

    prev?: T;
    value: T;
    next?: T;
};

interface ListNode<T> {
    prev?: ListNode<T>;
    value: T;
    next?: ListNode<T>;
};

export class LinkedList<T> {
    protected list = new Array<T>();

    protected first: ListNode<T> = null;
    protected last: ListNode<T> = null;

    onChange: (changes: ChangeResult<T>) => void = () => {};

    protected returnNode(node: ListNode<T>) {
        if (!node?.value) {
            return null;
        }

        return {
            prev: node.prev?.value,
            value: node.value,
            next: node.next?.value,
        };
    }

    tryEmit(type: ChangeType, node: ListNode<T>) {
        let result = this.returnNode(node);

        if (result) {
            this.onChange({
                type,
                ...result
            });
        }

        return result;
    }

    find(value: T) {
        return this.returnNode(this._find(value));
    }

    protected _find(value: T) {
        let node = this.first;

        while (node && node?.value !== value) {
            node = node.next;
        }
        
        return node;
    }

    delete(value: T) {
        let node = this._find(value);

        if (node) {
            this.tryEmit('delete', node);

            delete node.prev?.next;
            delete node.next?.prev;

            if (node.prev && node.next) {
                node.prev.next = node.next;
                node.next.prev = node.prev;
            } else {
                if (!node.prev) {
                    this.first = node.next;
                }
                if (!node.next) {
                    this.last = node.prev;
                }
            }
        }

        return this.returnNode(node);
    }

    protected _insertLast(value: T) {
        if (this.last) {
            this.last.next = {
                prev: this.last,
                value,
                next: null,
            };
            this.last = this.last.next;
        } else {
            this.last = this.first = {
                prev: null,
                value,
                next: null,
            };
        }

        return this.tryEmit('insert', this.last);
    }

    protected _insertFirst(value: T) {
        if (this.first) {
            this.first.prev = {
                prev: null,
                value,
                next: this.first,
            };
            this.first = this.first.prev;
        } else {
            this.last = this.first = {
                prev: null,
                value,
                next: null,
            };
        }

        return this.tryEmit('insert', this.first);
    }

    insertLast(value: T) {
        this.delete(value);

        return this._insertLast(value);
    }

    insertFirst(value: T) {
        this.delete(value);

        return this._insertFirst(value);
    }

    insertAfter(value: T, after?: T) {
        this.delete(value);
        
        let afterNode = this._find(after);

        if (!afterNode) {
            return this._insertLast(value);
        }
        
        let node: ListNode<T> = {
            prev: afterNode,
            value,
            next: afterNode.next,
        };

        node.prev.next = node;
        if (node.next) {
            node.next.prev = node;
        } else {
            this.last = node;
        }

        return this.tryEmit('insert', node);
    }

    insertBefore(value: T, before?: T) {
        this.delete(value);
        
        let beforeNode = this._find(before);

        if (!beforeNode) {
            return this._insertFirst(value);
        }
        
        let node: ListNode<T> = {
            prev: beforeNode.prev,
            value,
            next: beforeNode,
        };

        node.next.prev = node;
        if (node.prev) {
            node.prev.next = node;
        } else {
            this.first = node;
        }

        return this.tryEmit('insert', node);
    }
};
