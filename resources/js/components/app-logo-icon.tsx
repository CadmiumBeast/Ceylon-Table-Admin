import { ImgHTMLAttributes } from 'react';

export default function AppLogoIcon(props: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <img src="images/ctable.png" alt="Ceylon Table" {...props} />
    );
}
