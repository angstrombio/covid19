import numpy as np


def Fit(t, n):
    # Eliminate zero counts
    t = t[n > 0]
    n = n[n > 0]
    # Make sure there is enough data to do linear regression
    if len(n) > 1:
        # Weighted least squares fit of log(n)
        w = np.sqrt(n)
        l = np.log(n)
        tbar = np.average(t)
        lbar = np.average(l)
        f = np.sum((t-tbar)*(l-lbar)*w)/np.sum((t-tbar) * (t-tbar)*w)
        return f
    else:
        return 0.0
