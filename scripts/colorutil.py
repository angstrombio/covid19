import numpy as np

def ChooseColor(n1, n2):
    #
    # Function to choose a color based on a pair of case counts
    # n1 - the first count
    # n2 - the second count
    #
    # Return value is an r, g, b tuple where each color varies from 0 to 1
    #
    # If the count goes from 0 to anything, color that bright red
    # If the count goes from anything to 0, color it bright blue
    # If there is no change, color it green
    # If there is a change in counts, choose a shade that conveys the change
    # For low counts, the saturation is reduced corresponding to the lower
    # significance of changes when there isn't much data
    #
    fac = 10.0
    if (n1 > 0 and n2 > 0):
        val = fac * np.log(n1 / n2)
        r = -min(val, 0.0) / (1.0 - min(val, 0.0))
        g = 1.0 / (1.0 + abs(val))
        b = max(val, 0.0) / (1.0 + max(val, 0.0))
        sat = 1.0 - 1.0 / np.sqrt(n1 + n2)
        r = sat * r + (1.0 - sat)
        g = sat * g + (1.0 - sat)
        b = sat * b + (1.0 - sat)
    else:
        if n1 <= 0 and n2 > 0:
            r = 1.0
            g = 0.0
            b = 0.0
        else:
            if n1 > 0 and n2 <= 0:
                r = 0.0
                g = 0.0
                b = 1.0
            else:
                r = 1.0
                g = 1.0
                b = 1.0
    return(r,g,b)