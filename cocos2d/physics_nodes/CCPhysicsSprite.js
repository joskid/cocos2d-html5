/* Copyright (c) 2012 Scott Lembcke and Howling Moon Software
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/** A CCSprite subclass that is bound to a physics body.
 It works with:
 - Chipmunk: Preprocessor macro CC_ENABLE_CHIPMUNK_INTEGRATION should be defined
 - Objective-Chipmunk: Preprocessor macro CC_ENABLE_CHIPMUNK_INTEGRATION should be defined
 - Box2d: Preprocessor macro CC_ENABLE_BOX2D_INTEGRATION should be defined

 Features and Limitations:
 - Scale and Skew properties are ignored.
 - Position and rotation are going to updated from the physics body
 - If you update the rotation or position manually, the physics body will be updated
 - You can't eble both Chipmunk support and Box2d support at the same time. Only one can be enabled at compile time
 */
(function () {
    var box2dAPI = {
        _ignoreBodyRotation:false,
        _body:null,
        _PTMRatio:32,
        _rotation:1,
        setBody:function (body) {
            this._body = body;
        },
        getBody:function () {
            return this._body;
        },
        setPTMRatio:function (r) {
            this._PTMRatio = r;
        },
        getPTMRatio:function () {
            return this._PTMRatio;
        },
        getPosition:function () {
            var pos = this._body.GetPosition();
            return cc.p(pos.x * this._PTMRatio, pos.y * this._PTMRatio);
        },
        setPosition:function (p) {
            var angle = this._body.GetAngle();
            this._body.setTransform(Box2D.b2Vec2(p.x / this._PTMRatio, p.y / this._PTMRatio), angle);
        },
        getRotation:function () {
            return (this._ignoreBodyRotation ? cc.RADIANS_TO_DEGREES(this._rotationRadians) : cc.RADIANS_TO_DEGREES(this._body.GetAngle()));
        },
        setRotation:function (r) {
            if (this._ignoreBodyRotation) {
                this._rotation = r;
            }
            else {
                var p = this._body.GetPosition();
                this._body.SetTransform(p, cc.DEGREES_TO_RADIANS(r));
            }
        },
        _syncPosition:function () {
            var pos = this._body.GetPosition();
            this._position = cc.p(pos.x * this._PTMRatio, pos.y * this._PTMRatio);
            this._rotationRadians = this._rotation * (Math.PI / 180);
        },
        _syncRotation:function () {
            this._rotationRadians = this._body.GetAngle();
        },
        visit:function () {
            if (this._body && this._PTMRatio) {
                this._syncPosition();
                if (!this._ignoreBodyRotation)
                    this._syncRotation();
            }
            else {
                cc.log("PhysicsSprite body or PTIMRatio was not set");
            }
            this._super();
        }
    };
    var chipmunkAPI = {
        _ignoreBodyRotation:false,
        _body:null, //physics body
        _rotation:1,
        setBody:function (body) {
            this._body = body;
        },
        getBody:function () {
            return this._body;
        },
        getPosition:function () {
            return {x:this._body.p.x, y:this._body.p.y};
        },
        setPosition:function (pos) {
            this._body.p.x = pos.x;
            this._body.p.y = pos.y;
            //this._syncPosition();
        },
        _syncPosition:function () {
            this._position = {x:this._body.p.x, y:this._body.p.y};
        },
        getRotation:function () {
            return this._ignoreBodyRotation ? cc.RADIANS_TO_DEGREES(this._rotationRadians) : -cc.RADIANS_TO_DEGREES(this._body.a)
        },
        setRotation:function (r) {
            if (this._ignoreBodyRotation) {
                this._super(r);
            }
            else {
                this._body.a = -cc.DEGREES_TO_RADIANS(r);
                //this._syncRotation();
            }
        },
        _syncRotation:function () {
            this._rotationRadians = -this._body.a;
        },
        visit:function (ctx) {
            if (this._body) {
                this._syncPosition();
                if (!this._ignoreBodyRotation)
                    this._syncRotation();
            }
            else {
                cc.log("PhysicsSprite body was not set");
            }
            this._super(ctx);
        }
    };
    cc.PhysicsSprite = cc.Sprite.extend(chipmunkAPI);

    /**
     * Create a PhysicsSprite with filename and rect
     * @constructs
     * @param {String} fileName
     * @param {cc.Rect} rect
     * @return {cc.Sprite}
     * @example
     * //create a sprite with filename
     * var sprite1 = cc.Sprite.create("HelloHTML5World.png");
     *
     * //create a sprite with filename and rect
     * var sprite2 = cc.PhysicsSprite.create("HelloHTML5World.png",cc.rect(0,0,480,320));
     */
    cc.PhysicsSprite.create = function (fileName, rect) {
        var argnum = arguments.length;
        var sprite = new cc.PhysicsSprite();
        if (argnum === 0) {
            if (sprite.init())
                return sprite;
            return null;
        } else if (argnum < 2) {
            /** Creates an sprite with an image filename.
             The rect used will be the size of the image.
             The offset will be (0,0).
             */
            if (sprite && sprite.initWithFile(fileName)) {
                return sprite;
            }
            return null;
        } else {
            /** Creates an sprite with an CCBatchNode and a rect
             */
            if (sprite && sprite.initWithFile(fileName, rect)) {
                return sprite;
            }
            return null;
        }
    };

    /**
     * Creates a PhysicsSprite with a sprite frame name
     * @param {String} spriteFrame name
     * @return {cc.Sprite}
     * @example
     *
     * //create a PhysicsSprite with a sprite frame
     * var sprite = cc.PhysicsSprite.createWithSpriteFrameName('grossini_dance_01.png');
     */
    cc.PhysicsSprite.createWithSpriteFrameName = function (spriteFrameName) {
        var spriteFrame = null;
        if (typeof(spriteFrameName) == 'string') {
            spriteFrame = cc.SpriteFrameCache.getInstance().getSpriteFrame(spriteFrameName);
            if (!spriteFrame) {
                cc.log("Invalid spriteFrameName: " + spriteFrameName);
                return null;
            }
        } else {
            cc.log("Invalid argument. Expecting string.");
            return null;
        }
        var sprite = new cc.PhysicsSprite();
        if (sprite && sprite.initWithSpriteFrame(spriteFrame)) {
            return sprite;
        }
        return null;
    };

    /**
     * Creates a sprite with a sprite frame.
     * @param {cc.SpriteFrame} spriteFrame
     * @return {cc.Sprite}
     * @example
     * //get a sprite frame
     * var spriteFrame = cc.SpriteFrameCache.getInstance().getSpriteFrame("grossini_dance_01.png");
     *
     * //create a sprite with a sprite frame
     * var sprite = cc.Sprite.createWithSpriteFrameName(spriteFrame);
     */
    cc.PhysicsSprite.createWithSpriteFrame = function (spriteFrame) {
        var sprite = new cc.PhysicsSprite();
        if (sprite && sprite.initWithSpriteFrame(spriteFrame)) {
            return sprite;
        }
        return null;
    };


})();
