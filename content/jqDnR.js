(function ($) {
    $.fn.jqDrag = function (h, ic, c) {
        return i(this, h, 'd', c, ic);
    };
    $.fn.jqResize = function (h, ic, c) {
        return i(this, h, 'r', c, ic);
    };
    $.jqDnR = {
        dnr: {},
        e: 0,
        drag: function (v) {
            if (M.k == 'd') {E.css({
                left: Math.max(M.X + v.pageX - M.pX,0),
                top: Math.max(M.Y + v.pageY - M.pY,0)
                });
                if(M.ic) {
                    $.proxy(M.ic, M)(E.css('top'), E.css('left'));
                }
            }
            else {
                E.css({
                    width: Math.max(v.pageX - M.pX + M.W, 0),
                    height: Math.max(v.pageY - M.pY + M.H, 0)
                });
                if(M.ic) {
                    $.proxy(M.ic, E)(E.css('width'),E.css('height'));
                }
            }

            if(v.pageY < window.content.pageYOffset) {
                var y = v.pageY - window.content.pageYOffset;
            }
            else if (v.pageY > window.content.innerHeight + window.content.pageYOffset) {
                var y = v.pageY - (window.content.innerHeight + window.content.pageYOffset);
            }

            if(v.pageX < window.content.pageXOffset) {
                var x = v.pageX - window.content.pageXOffset;
            }
            else if (v.pageX > window.content.innerWidth + window.content.pageXOffset) {
                var x = v.pageX - (window.content.innerWidth + window.content.pageXOffset);
            }

            if(x || y) {
                window.content.scrollBy(x,y)
            }
            return false;
        },
        stop: function () {
            E.css('opacity',M.o);
            $(window.content.document).unbind('mousemove', J.drag).unbind('mouseup', J.stop);
            if (M.c) $.proxy(M.c, E)();
        }
    };
    var J = $.jqDnR,
        M = J.dnr,
        E = J.e,
        i = function (e, h, k, c, ic) {
        return e.each(function () {
            h = (h) ? $(h, e) : e;
            h.bind('mousedown', {
                e: e,
                k: k,
                c: c,
                ic:ic
            }, function (v) {
                var d = v.data,
                    p = {};
                E = d.e;
                // attempt utilization of dimensions plugin to fix IE issues
                if (E.css('position') != 'relative') {
                    try {
                        E.position(p);
                    } catch (e) {}
                }
                if(!d.c) {
                    d.c = d.ic;
                    d.ic = undefined;
                }
                M = {
                    X: p.left || f('left') || 0,
                    Y: p.top || f('top') || 0,
                    W: f('width') || E[0].scrollWidth || 0,
                    H: f('height') || E[0].scrollHeight || 0,
                    pX: v.pageX,
                    pY: v.pageY,
                    k: d.k,
                    o: E.css('opacity'),
                    c: d.c,
                    ic: d.ic
                };
                E.css('opacity',0.8);
                $(window.content.document).mousemove($.jqDnR.drag).mouseup($.jqDnR.stop);
                return false;
            });
        });
    },
    f = function (k) {
        return parseInt(E.css(k)) || false;
    };
})(jQuery);