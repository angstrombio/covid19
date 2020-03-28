import matplotlib.pyplot as plt
import matplotlib.patches as ptc

from colorutil import choose_color

#
# Setup a plot color each rectangle according the the counts at is lower left corner
# Dotted lines correspond to 1.1 fold change
# Dashed lines corresond to 1.2 fold change
#

xmin = 0
ymin = 0
xmax = 16
ymax = 16
x = (xmin, xmax)
y = (ymin, ymax)
# plt.plot(x, y, color='black', lw=1.0)
plt.xlim = (xmin, xmax)
plt.ylim = (ymin, ymax)
plt.xlabel('cases at time 0')
plt.ylabel('cases at time +1')
plt.plot(x, (ymin/1.1, ymax/1.1), ls=':', color='black', lw=1.0)
plt.plot(x, (ymin/1.2, ymax/1.2), ls='--', color='black', lw=1.0)
plt.plot((xmin/1.1, xmax/1.1), y, ls=':', color='black', lw=1.0)
plt.plot((xmin/1.2, xmax/1.2), y, ls='--', color='black', lw=1.0)
# plt.xscale('log')
# plt.yscale('log')
#
# Show the colors chosen for different pairs of counts
#
for x in range(xmin, xmax):
    for y in range(ymin, ymax):
        c = choose_color(x, y)
        rect = ptc.Rectangle((x, y), 1., 1., fill=True, color=c)
        plt.gca().add_patch(rect)
plt.show()
