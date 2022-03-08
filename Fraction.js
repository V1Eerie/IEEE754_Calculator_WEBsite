// Copyright (c) 2016, Dr. Edmund Weitz
// depends on BigInteger.js

// a "Fraction" object represents a rational number with a numerator
// or a denominator; both of these are "bigInt" objects so that we
// have infinite precision
function Fraction(num, den) {
    // if there's only one argument to the constructor, we construct a
    // fraction representing an integer
    den = den || 1;
    this.num = bigInt(num);
    this.den = bigInt(den);
    this.cancel();
}

// "Fraction" objects are always canceled and the denominator is never
// negative; that's done by this function
Fraction.prototype.cancel = function() {
    var gcd = bigInt.gcd(this.num, this.den);
    this.num = this.num.divide(gcd);
    this.den = this.den.divide(gcd);
    if (this.den.isNegative()) {
        this.num = this.num.multiply(-1);
        this.den = this.den.multiply(-1);
    }
};

// all the function below which return "Fraction" objects will always
// return /fresh/ objects and never re-use their arguments

// add "summand" to fraction
Fraction.prototype.add = function(summand) {
    var den = this.den.multiply(summand.den);
    var num = this.num.multiply(summand.den).add(this.den.multiply(summand.num));
    return new Fraction(num, den);
};

// subtract "subtrahend" from fraction
Fraction.prototype.sub = function(subtrahend) {
    var den = this.den.multiply(subtrahend.den);
    var num = this.num.multiply(subtrahend.den).subtract(this.den.multiply(subtrahend.num));
    return new Fraction(num, den);
};

// multiply fraction with "factor"
Fraction.prototype.mult = function(factor) {
    var num = this.num.multiply(factor.num);
    var den = this.den.multiply(factor.den);
    return new Fraction(num, den);
};

// divide fraction by "divisor"
Fraction.prototype.div = function(divisor) {
    var num = this.num.multiply(divisor.den);
    var den = this.den.multiply(divisor.num);
    return new Fraction(num, den);
};

// whether the fraction and "other" are equal
Fraction.prototype.eq = function(other) {
    // should not be necessary for canceled fractions, but anyway...
    return this.num.multiply(other.den).equals(this.den.multiply(other.num));
};

// whether fraction is greater than "other"
Fraction.prototype.gt = function(other) {
    if (this.num.isPositive() && !other.num.isPositive())
        return true;
    if (!this.num.isPositive() && other.num.isPositive())
        return false;
    return this.num.multiply(other.den).greater(this.den.multiply(other.num));
};

// whether fraction is greater than "other" or equal to it
Fraction.prototype.ge = function(other) {
    return this.gt(other) || this.eq(other);
};

// whether fraction is less than "other"
Fraction.prototype.lt = function(other) {
    return other.gt(this);
};

// whether fraction is less than "other" or equal to it
Fraction.prototype.le = function(other) {
    return this.lt(other) || this.eq(other);
};

// whether fraction is positive
Fraction.prototype.isPositive = function() {
    // remember that the denominator is always positive
    return this.num.isPositive();
};

// whether fraction is negative
Fraction.prototype.isNegative = function() {
    // remember that the denominator is always positive
    return this.num.isNegative();
};

// whether the fraction is equal to zero
Fraction.prototype.isZero = function() {
    return this.num.isZero();
};

// returns the absolute value of the fraction
Fraction.prototype.abs = function() {
    return new Fraction(this.num.abs(), this.den);
};

// string representation of the fraction; only used for debugging
Fraction.prototype.toString = function() {
    return (this.isNegative() ? "-" : "") + this.num.toString() + "/" + this.den.toString();
};

// computes the integer part of the fraction as a JavaScript integer;
// assumes that the fraction is positive!
Fraction.prototype.floor = function() {
    var i = 0;
    var val = this;
    while (val.ge(Fraction.ONE)) {
        i += 1;
        val = val.sub(Fraction.ONE);
    }
    return i;
};

// returns the ceiling of the decadic logarithm of the fraction as a
// JavaScript integer; assumes that its argument is positive
Fraction.prototype.log10 = function() {
    var val = this;
    var i = 0;
    if (val.ge(Fraction.ONE)) {
        while (val.gt(Fraction.ONE)) {
            i += 1;
            val = val.div(Fraction.TEN);
        }
        return i;
    } else {
        val = val.mult(Fraction.TEN);
        while (val.le(Fraction.ONE)) {
            i -= 1;
            val = val.mult(Fraction.TEN);
        }
        return i;
    }
};

// some constants
Fraction.ZERO = new Fraction(0, 1); // 0
Fraction.ONE = new Fraction(1, 1); // 1
Fraction.MINUSONE = new Fraction(-1, 1); // -1
Fraction.TWO = new Fraction(2, 1); // 2
Fraction.HALF = new Fraction(1, 2); // 1/2
Fraction.TEN = new Fraction(10, 1); // 10
Fraction.TWOTEN = new Fraction(1024, 1); // 2^{10}
Fraction.TWOFIFTY = new Fraction(1125899906842624, 1); // 2^{50}
Fraction.TWOMINUSTEN = new Fraction(1, 1024); // 2^{-10}
Fraction.TWOMINUSFIFTY = new Fraction(1, 1125899906842624); // 2^{-50}