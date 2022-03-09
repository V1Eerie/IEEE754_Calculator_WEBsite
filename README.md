# Note:
Original：http://weitz.de/ieee/
Chinese Mirror Version：https://www.implementsfreedom.tech/ieee754/ieee754.html

    这是一个简单的计算器，旨在帮助你理解 IEEE 754标准的浮点计算。
    它是用JavaScript实现的，应该可以在最近的桌面版Chrome和Firefox上运行。
    我还没有在其他浏览器上测试过。(在Chrome上它看起来有点丑，因为输入框太宽了）。

    如果你在左边的三个框中输入一个浮点数，并按下Enter键，你会在右边看到这个数字的比特型式。
    你可以按照编程语言中常见的语法格式来输入数字，例如42, 2.345, 12E-3等；
    你也可以输入NaN, Inf, 和 -Inf等值；你还可以使用17/23的型式来输入分数。
    最后，你就获得了你需要的二进制数形式（他们以0b或0x为开头）。

    或者你可以逆向操作，选择输入右边的空位。当你按下Enter键，左边的数字就会被更新。
    在数字段中，你也可以输入一个以+或 -开头的小数，而不是比特型式。 
    (注意，红色数字是 隐藏位，不能直接改变)。

    按下四个按钮中的一个，可以对按钮上方的两个数字进行加、减、乘、除，并在下面显示结果。

    舍入浮点数时使用的是舍入到最接近浮点数，偶数优先。 
    代码不区分quite和signaling NaN，即所有的NaN都是quite的，符合IEEE 754-2008标准，
    Intel 8086处理器采取也是这种形式
    （小数最高位A  为'is_quiet'标记位。即，如果A = 1，则该数是quiet NaN；
            如果A为零、其余X部分非零，则是signaling NaN）。

    IEEE标准定义了各种二进制和十进制格式。
    本页的默认格式是 64位，但你可以使用下面的按钮来切换到其他二进制位。

# Other:
    本页面仅为中文翻译备份存档，不提供任何商业性用途。若有侵权请联系删除。本人没有任何责任。
    
    Copyright (c) 2016, Prof. Dr. Edmund Weitz. Impressum, Datenschutzerklärung.
