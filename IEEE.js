// Copyright (c) 2016, Dr. Edmund Weitz

// helper function which checks if all elements of the array L are
// zeros
function allZeros(L) {
    return L.every(function(x) { return x == 0; });
}

// an "IEEE" object holds one numerical value which is determined
// either like this:
// - if "nan" is true, the value is "NaN"
// - if "inf" is true, the value is "Inf" or "-Inf", depending on "minus"
// - otherwise, the absolute value is "val" and "minus" signifies a negative value
// there will also be two additional slots for information which is
// essentially redundant:
// - "mantissa" is an array of bits for the significand
// - "exp" is the exponent (without bias) stored as a JavaScript integer
//         with the two extreme values IEEE.NaNExp and 1 - IEEE.NaNExp used
//         for NaN, Inf, and denormalized numbers
function IEEE(val) {
    // argument can be a fraction or a bigInt
    this.val = val instanceof Fraction ? val : new Fraction(val);
    this.minus = false;
    // argument can be negative
    if (this.val.isNegative()) {
        this.minus = true;
        this.val = this.val.abs();
    }
    // convert very small values immediately to zero
    if (!this.val.isZero() && this.val.mult(Fraction.TWO).le(IEEE.smallestPositive)) {
        this.val = new Fraction(0);
    }
    this.nan = false;
    this.inf = false;
}

// sets some global values depending on the bit size of the current
// standard; supported values are 16, 32, 64, and 128
IEEE.switchBitSize = function(size) {
    size = size || 64;
    IEEE.numberOfBits = size;
    switch (size) {
        case 16:
            // exponet for NaN and Inf
            IEEE.NaNExp = 16;
            // number of bits for significand (without sign and hidden bit)
            IEEE.mantissaLen = 10;
            // regular expression for a bit string of the correct length
            IEEE.binRegex = /^[01]{1,16}$/;
            // regular expression for the corresponding hexadecimal number
            IEEE.hexRegex = /^[0-9a-fA-F]{1,4}$/;
            break;
        case 32:
            IEEE.NaNExp = 128;
            IEEE.mantissaLen = 23;
            IEEE.binRegex = /^[01]{1,32}$/;
            IEEE.hexRegex = /^[0-9a-fA-F]{1,8}$/;
            break;
        case 128:
            IEEE.NaNExp = 16384;
            IEEE.mantissaLen = 112;
            IEEE.binRegex = /^[01]{1,128}$/;
            IEEE.hexRegex = /^[0-9a-fA-F]{1,32}$/;
            break;
        default:
            IEEE.NaNExp = 1024;
            IEEE.mantissaLen = 52;
            IEEE.binRegex = /^[01]{1,64}$/;
            IEEE.hexRegex = /^[0-9a-fA-F]{1,16}$/;
            break;
    }
    IEEE.smallestPositive = fractionTimesPower(bigInt.one, -IEEE.mantissaLen - IEEE.NaNExp + 2);
};

// default
IEEE.switchBitSize(64);

// checks is object represents zero (positive or negative)
IEEE.prototype.isZero = function() {
    return !this.nan && !this.inf && this.val.isZero();
};

// returns a new IEEE object representing "-0.0"
IEEE.newNegZero = function() {
    var result = new IEEE(0);
    result.minus = true;
    return result;
};

// returns a new IEEE object representing NaN
IEEE.newNaN = function() {
    var result = new IEEE(0);
    result.nan = true;
    return result;
};

// returns a new IEEE object representing Inf or (if "minus" is true) -Inf
IEEE.newInf = function(minus) {
    var result = new IEEE(0);
    result.inf = true;
    result.minus = minus ? true : false;
    return result;
};

// set the "mantissa" and "exponent" slots of the IEEE objects
// according to "nan", "inf", and "val"
IEEE.prototype.updateBits = function() {
    if (this.nan) {
        this.exp = IEEE.NaNExp;
        // only ones
        this.mantissa = new Array(IEEE.mantissaLen);
        this.mantissa.fill(1);
        return;
    }
    if (this.inf) {
        this.exp = IEEE.NaNExp;
        // only zeros
        this.mantissa = new Array(IEEE.mantissaLen);
        this.mantissa.fill(0);
        return;
    }
    var exp = 0;
    var val = this.val;
    // zeros first, including very small values
    if (val.isZero() || val.mult(Fraction.TWO).lt(IEEE.smallestPositive)) {
        this.exp = 1 - IEEE.NaNExp;
        this.mantissa = new Array(IEEE.mantissaLen);
        this.mantissa.fill(0);
        return;
    }
    // adjust "val" so that it's between one and two and adjust "exp"
    // correspondingly; do this in larger steps first to save some time
    // for very large and very small values
    while (val.ge(Fraction.TWOFIFTY)) {
        val = val.div(Fraction.TWOFIFTY);
        exp += 50;
    }
    while (val.ge(Fraction.TWOTEN)) {
        val = val.div(Fraction.TWOTEN);
        exp += 10;
    }
    while (val.ge(Fraction.TWO)) {
        val = val.div(Fraction.TWO);
        exp += 1;
    }
    while (val.lt(Fraction.TWOMINUSFIFTY)) {
        val = val.mult(Fraction.TWOFIFTY);
        exp -= 50;
    }
    while (val.lt(Fraction.TWOMINUSTEN)) {
        val = val.mult(Fraction.TWOTEN);
        exp -= 10;
    }
    while (val.lt(Fraction.ONE)) {
        val = val.mult(Fraction.TWO);
        exp -= 1;
    }
    // if the exponent would be too big, we call it "infinity"
    if (exp >= IEEE.NaNExp) {
        this.inf = true;
        this.updateBits();
        return;
    }
    if (exp < 2 - IEEE.NaNExp) {
        // for denormalized numbers, we might have to shift the number to
        // the right (which will result in initial zeros in the mantissa);
        // this depends on "exp"
        val = val.div(fractionTimesPower(bigInt.one, 2 - IEEE.NaNExp - exp));
        // always the same exponent
        exp = 1 - IEEE.NaNExp;
    } else {
        // for normalized numbers, subtract one for the "hidden bit"
        val = val.sub(Fraction.ONE);
    }
    var mantissa = [];
    var count = 0;
    // now fill the array "mantissa" bit by bit
    while (count < IEEE.mantissaLen) {
        val = val.mult(Fraction.TWO);
        if (val.ge(Fraction.ONE)) {
            mantissa.push(1);
            val = val.sub(Fraction.ONE);
        } else {
            mantissa.push(0);
        }
        count += 1;
    }
    // "val" has the remainder now, make "count" point to the last bit
    // in "mantissa"
    count = mantissa.length - 1;
    // if the remainder is more than 0.5 or if it is exactly 0.5 and the
    // last bit is a one, we round up
    if (val.gt(Fraction.HALF) || (val.eq(Fraction.HALF) && mantissa[count] == 1)) {
        // we essentially just add one, but we need to watch out for
        // carrys
        while (count >= 0) {
            if (mantissa[count] == 0) {
                mantissa[count] = 1;
                break;
            }
            mantissa[count] = 0;
            count--;
        }
        // if all bits are zero now, the carry went all the way to the
        // left
        if (allZeros(mantissa)) {
            // the number became to big, so it's "Inf" now
            if (exp == IEEE.NaNExp) {
                this.inf = true;
                this.updateBits();
                return;
            }
            // otherwise just increase the exponent; note that this works
            // the same for denormalized numbers
            exp += 1;
        }
    }
    this.mantissa = mantissa;
    this.exp = exp;
};

// sets "nan", "inf", and "val" according to the values of "mantissa"
// and "exp", so this is kind of the inverse to "updateBits"
IEEE.prototype.fromBits = function() {
    // first the special cases Inf and NaN
    if (this.exp == IEEE.NaNExp) {
        if (allZeros(this.mantissa)) {
            this.inf = true;
            this.nan = false;
        } else {
            this.inf = false;
            this.nan = true;
        }
        return;
    }
    this.nan = false;
    this.inf = false;
    // hidden bit
    var val = bigInt.one;
    var exp = this.exp;
    if (this.exp == 1 - IEEE.NaNExp) {
        if (allZeros(this.mantissa)) {
            // zero
            this.val = new Fraction(0);
            return;
        } else {
            // denormalized, so hidden bit is zero
            val = bigInt.zero;
            // adjust exp to what it really "means"
            exp = 2 - IEEE.NaNExp;
        }
    }
    // now loop through bits and compute value
    var i = 0;
    while (i < IEEE.mantissaLen) {
        val = val.multiply(2);
        val = val.add(this.mantissa[i]);
        i++;
    }
    // multiply with two times exponent, but also divide by the left
    // shift from the loop above
    this.val = fractionTimesPower(val, exp - IEEE.mantissaLen);
};

// helper function which computes the product of "val" (a bigInt) and
// "base" to the "exp" power
function fractionTimesPower(val, exp, base) {
    // default base is two
    base = base || 2;
    // let the bigInt constructor read the factor as a string
    if (exp >= 0)
        return new Fraction(val.multiply(bigInt("1" + "0".repeat(exp), base)));
    else
        return new Fraction(val, bigInt("1" + "0".repeat(-exp), base));
}

// constructs a Fraction object from a list of decimal digits; if for
// example "L" is [3, 4, 5] and "k" is 2, this is interpreted as "0.345 * 10^2"
function decFromList(L, k) {
    return new Fraction(bigInt(L.join(""))).mult(fractionTimesPower(bigInt.one, k - L.length, 10));
}

// returns the numerical value of the IEEE object as a string in
// decimal format; can't cope with "Inf", "NaN", or zero; based on the
// Burger/Dybvig algorithm without any effort to make this efficient
IEEE.prototype.decimalOutput = function() {
    // we will first set "e" and "v" such that the value
    // is "v * 2^e" where "v" is the mantissa interpreted as an integer
    var e, v;
    if (this.exp == 1 - IEEE.NaNExp) {
        v = bigInt.zero;
        e = 1 + this.exp - IEEE.mantissaLen;
    } else {
        v = bigInt.one;
        e = this.exp - IEEE.mantissaLen;
    }
    var i = 0;
    while (i < IEEE.mantissaLen) {
        v = v.multiply(2);
        if (this.mantissa[i])
            v = v.add(1);
        i += 1;
    }
    // now let "succ" be the next representable number and "pred" the
    // previous one
    var succ = fractionTimesPower(v.add(1), e);
    var pred;
    if (this.mantissa[0] == 1 && allZeros(this.mantissa.slice(1)))
    // special case where the mantissa is "10.....0" and the
    // predecessor is thus "11.....1" of the same length but with the
    // exponent being one less
        pred = fractionTimesPower(v.multiply(2).subtract(1), e - 1);
    else
        pred = fractionTimesPower(v.subtract(1), e);
    // combine "v" and "e" into one value
    v = fractionTimesPower(v, e);
    // "low" is the middle between "v" and "pred"
    var low = v.add(pred).div(Fraction.TWO);
    // and "high" is the middle between "v" and "succ", so all values
    // between "low" and "high" are OK to represent our "v"
    var high = v.add(succ).div(Fraction.TWO);

    // now we take the ceiling of the decadic logarithm of "high" and
    // divide "v" by the corresponding tower; "k" will be the starting
    // point for the exponent and "q0" (now less than one) for the value
    var k = high.log10();
    var q0 = v.mult(fractionTimesPower(bigInt.one, -k, 10));
    var d = [];
    var dVal1, dVal2, cond1, cond2;
    // now in a loop extract digits from "q0"; the current digit is
    // called "f", the list of digits is "d"
    while (true) {
        q0 = q0.mult(Fraction.TEN);
        var f = q0.floor();
        d.push(f);
        // "dVal1" is the first candidate: the current list of digits
        dVal1 = decFromList(d, k);
        // check if it's greater than "low"
        cond1 = (dVal1.gt(low));
        if (d[d.length - 1] < 9) {
            // if the last digit of "d" isn't nine, we increase it for the
            // second candidate, "dVal2", which is "one digit greater" than
            // "dVal1"
            dVal2 = decFromList(d.slice(0, -1).concat([d[d.length - 1] + 1]), k);
            // check if it's less than "high"
            cond2 = (dVal2.lt(high));
        } else {
            cond2 = false;
        }
        if (cond1 && !cond2) {
            // if only "dVal1" is OK, this is it
            return decimalString(this.minus, k, d);
        } else if (cond2 && !cond1) {
            // if only "dVal2" is OK, this is it
            return decimalString(this.minus, k, d.slice(0, -1).concat([d[d.length - 1] + 1]));
        } else if (cond1 && cond2) {
            // if both are OK, take the one closer to "v"
            if (dVal1.sub(v).abs().lt(dVal2.sub(v).abs()))
                return decimalString(this.minus, k, d);
            else
                return decimalString(this.minus, k, d.slice(0, -1).concat([d[d.length - 1] + 1]));
        }
        q0 = q0.sub(new Fraction(f));
    }
};

// generates the string for the function above; receives as input a
// boolean (whether the number is negative), and exponent, and a list
// of digits; the latter two arguments are interpreted as in
// "decFromList"
function decimalString(minus, exp, digits) {
    var size;
    // set a meaningful maximal length for numbers which aren't shown in
    // scientific notation if possible
    switch (IEEE.numberOfBits) {
        case 16:
            size = 5;
            break;
        case 32:
            size = 9;
            break;
        case 128:
            size = 36;
            break;
        default:
            size = 17;
            break;
    }

    var sign = minus ? "-" : "";
    if (exp >= digits.length && exp < size)
    // integers which can be shown without an exponent
        return sign + digits.join("") + "0".repeat(exp - digits.length) + ".0";
    if (exp < 1 && digits.length - exp < size)
    // absolute value smaller than one and can be shown without
    // exponent
        return sign + "0." + "0".repeat(-exp) + digits.join("");
    // by default, the decimal point comes after the first digit
    var index = 1;
    // but shift it if possible
    if (exp >= 1 && exp < digits.length)
        index = exp;
    var str = sign + digits.slice(0, index).join("");
    if (index < digits.length)
        str += "." + digits.slice(index).join("");
    if (exp != index)
        str += "E" + (exp - index);
    return str;
}

// a bigInt constant (10^{10}) we'll need below
var tenTen = bigInt("1E10");

// parses string "str" as a decimal number and converts it into an
// IEEE object
IEEE.parseDecimal = function(str) {
    str = str.trim();
    // the various ways to write zero
    var regex = /^([+-])?(?:0(?:\.0*)?|\.00*)(?:E[+-]?\d+)?$/i;
    var match = regex.exec(str);
    if (match) {
        if (match[1] == "-")
            return IEEE.newNegZero();
        else
            return new IEEE(0);
    }
    // general format with regex groups for sign, (decimal) mantissa,
    // and exponent
    regex = /^([+-])?(\d+(?:\.\d*)?|\.\d\d*)(?:E([+-]?\d{1,5}))?$/i;
    match = regex.exec(str);
    if (!match)
        return IEEE.newNaN();
    var mantissa = match[2];
    var exp = parseInt(match[3] || "0");
    // remove leading zeros
    while (mantissa[0] == "0")
        mantissa = mantissa.slice(1);
    // but we need one in front of the decimal point
    if (mantissa[0] == ".")
        mantissa = "0" + mantissa;
    // mark were the point is
    var dot = mantissa.indexOf(".");
    if (dot != -1) {
        // if there is a point, remove trailing zeros
        while (mantissa[mantissa.length - 1] == "0")
            mantissa = mantissa.slice(0, -1);
        // remove point and adjust exponent accordingly
        exp -= mantissa.length - dot - 1;
        mantissa = mantissa.slice(0, dot) + mantissa.slice(dot + 1);
    }
    // the following is necessary because of bug in BigInteger.js: we
    // need to feed the number to the bigInt constructor piecemeal

    // add zeros back so that length is divisible by ten
    while (mantissa.length % 10 != 0)
        mantissa = "0" + mantissa;
    var big = bigInt.zero;
    while (mantissa.length > 0) {
        // yes, we could do that with splice...
        big = big.multiply(tenTen).add(bigInt(mantissa.slice(0, 10)));
        mantissa = mantissa.slice(10);
    }
    if (match[1] == "-")
        big = big.multiply(bigInt.minusOne);
    return new IEEE(fractionTimesPower(big, exp, 10));
};

// regular expression for fraction syntax
var fractionRegex = /^([+-])?(\d+)\/(\d+)$/;

// parses string "str" as a fraction and converts it into an IEEE
// object
IEEE.parseFraction = function(str) {
    str = str.trim();
    var match = fractionRegex.exec(str);
    if (!match)
        return IEEE.newNaN();
    var sign = match[1];
    if (sign != "-")
        sign = "+";
    var num = bigInt(match[2]);
    var den = bigInt(match[3]);
    // could be NaN or Inf if denominator is zero
    if (den.isZero())
        return num.isZero() ? IEEE.newNaN() : IEEE.newInf(sign == "-");
    if (num.isZero()) {
        // is zero if numerator is zero
        if (sign == "-")
            return IEEE.newNegZero();
        else
            return new IEEE(0);
    }
    // "normal" fraction
    return new IEEE(new Fraction(sign == "-" ? bigInt.zero.minus(num) : num, den));
};

// parses string "str" as a sequence of binary digits to be converted
// into an IEEE object
IEEE.parseBin = function(str) {
    str = str.trim();
    if (!IEEE.binRegex.exec(str))
        return IEEE.newNaN();
    // fill with zeros at the beginning if necessary
    str = "0".repeat(IEEE.numberOfBits - str.length) + str;
    var ieee = new IEEE(0);
    // create an array of ones and zeros from the string
    var bits = str.split("").map(function(x) { return parseInt(x); });
    // split into parts
    ieee.minus = (bits[0] == 1);
    ieee.exp = parseInt(str.slice(1, IEEE.numberOfBits - IEEE.mantissaLen), 2) - IEEE.NaNExp + 1;
    ieee.mantissa = bits.slice(IEEE.numberOfBits - IEEE.mantissaLen);
    // set value from bits
    ieee.fromBits();
    return ieee;
};

// parses string "str" as a sequence of hexadecimal digits to be
// converted into an IEEE object
IEEE.parseHex = function(str) {
    str = str.trim();
    if (!IEEE.hexRegex.exec(str))
        return IEEE.newNaN();
    var i = 0;
    var binStr = "";
    // go through the digits and convert each to four bits
    while (i < str.length) {
        var digits = Number(parseInt(str[i], 16)).toString(2);
        digits = "0".repeat(4 - digits.length) + digits;
        binStr += digits;
        i++;
    }
    // let the other function do the rest
    return IEEE.parseBin(binStr);
};

// general parsing function to combine all the specialized parsing
// functions from above
IEEE.parse = function(str) {
    str = str.trim();
    var regex = /^nan$/i;
    if (regex.exec(str))
        return IEEE.newNaN();
    regex = /^([+-])?inf$/i;
    var match = regex.exec(str);
    if (match)
        return IEEE.newInf(match[1] == "-");
    regex = /^0b/i;
    if (regex.exec(str))
        return IEEE.parseBin(str.slice(2));
    regex = /^0x/i;
    if (regex.exec(str))
        return IEEE.parseHex(str.slice(2));
    if (fractionRegex.exec(str))
        return IEEE.parseFraction(str);
    return IEEE.parseDecimal(str);
};