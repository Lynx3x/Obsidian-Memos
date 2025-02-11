import showPreviewImageDialog from './PreviewImageDialog';
import '../less/image.less';
import React from 'react';

interface Props {
  imgUrl: string;
  className?: string;
  alt: string;
  referrerPolicy?: 'no-referrer';
  filepath?: string;
  style?: React.CSSProperties;
}

const Image: React.FC<Props> = (props: Props) => {
  const { className, imgUrl, alt, referrerPolicy, filepath } = props;

  const handleImageClick = () => {
    if (filepath) {
      showPreviewImageDialog(imgUrl, filepath);
    } else {
      showPreviewImageDialog(imgUrl);
    }
  };

  return (
    <div className={'image-container ' + className} onClick={handleImageClick} style={props.style}>
      <img src={imgUrl} alt={alt} decoding="async" loading="lazy" referrerPolicy={referrerPolicy} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
    </div>
  );
};

export default Image;
