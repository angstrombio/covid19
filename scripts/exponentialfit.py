import numpy as np
from fitutil import Fit


# Fit data to exp(kt)
k = 1.0
t = np.arange(0.0, 4.0, 1.0)

# Run niter samples
niter = 100
fit = np.empty(niter)
for itr in range(niter):
    e = np.exp(k * t)
    n = np.random.poisson(e)
    fit[itr] = Fit(t, n)

# Calculate the average fit and std
f = np.average(fit).astype(float)
std = np.sqrt(np.var(fit)).astype(float)
print("Target:{:6.3f} Average fit:{:6.3f} std:{:6.3f}".format(k, f, std))
