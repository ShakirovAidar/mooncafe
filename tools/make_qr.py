# usage: python3 make_qr.py <menu-url> <logo.jpg> <out.png>
import sys,os,cv2,numpy as np
from PIL import Image,ImageDraw
url=sys.argv[1] if len(sys.argv)>1 else sys.exit("usage: python3 tools/make_qr.py https://your-domain [logo] [out.png]")
logo=sys.argv[2] if len(sys.argv)>2 else os.path.join(os.path.dirname(__file__),"..","public","assets","logo.jpg")
out=sys.argv[3] if len(sys.argv)>3 else "afterwave-menu-qr.png"
p=cv2.QRCodeEncoder_Params();p.correction_level=cv2.QRCodeEncoder_CORRECT_LEVEL_H
m=cv2.QRCodeEncoder_create(p).encode(url)
mod=(m<128) if m.dtype==np.uint8 else m
# m includes quiet border; rescale to crisp modules
n=m.shape[0];box=1100//n+1
im=Image.fromarray(np.where(m>127,255,0).astype('uint8')).resize((n*box,n*box),Image.NEAREST).convert('RGB')
W=im.size[0];d=ImageDraw.Draw(im)
L=int(W*0.24);x=(W-L)//2
pad=int(L*0.08)
d.rounded_rectangle([x-pad,x-pad,x+L+pad,x+L+pad],radius=int(L*.16),fill=(255,255,255))
lg=Image.open(logo).convert('RGB').resize((L,L))
mask=Image.new('L',(L,L),0);ImageDraw.Draw(mask).rounded_rectangle([0,0,L,L],radius=int(L*.14),fill=255)
im.paste(lg,(x,x),mask);im.save(out)
img=cv2.imread(out);val,_,_=cv2.QRCodeDetector().detectAndDecode(img)
print("size",im.size,"decoded:",val,"MATCH" if val==url else "FAIL")
