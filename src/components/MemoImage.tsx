import { TFile, Vault } from 'obsidian';
import React from 'react';
import { IMAGE_URL_REG, MARKDOWN_URL_REG, MARKDOWN_WEB_URL_REG, WIKI_IMAGE_URL_REG } from '../helpers/consts';
import appStore from '../stores/appStore';
import Only from './common/OnlyWhen';
import Image from './Image';

const imageGridStyles = {
  display: 'grid',
  gridTemplateColumns: `repeat(3, 150px)`,
  gap: '1px',
  marginTop: '4px',
  maxWidth: '452px'
} as const;

const imageItemStyles = {
  width: '150px',
  height: '150px',
} as const;

const imageStyle = {
  width: '100%',
  height: '100%'
} as const;

interface Props {
  memo: string;
}

interface LinkMatch {
  linkText: string;
  altText: string;
  path: string;
  filepath?: string;
}

const MemoImage: React.FC<Props> = (props: Props) => {
  const { memo } = props;

  const getPathOfImage = (vault: Vault, image: TFile) => {
    return vault.getResourcePath(image);
  };

  const detectWikiInternalLink = (lineText: string): LinkMatch | null => {
    const { metadataCache, vault } = appStore.getState().dailyNotesState.app;
    const internalFileName = WIKI_IMAGE_URL_REG.exec(lineText)?.[1];
    const internalAltName = WIKI_IMAGE_URL_REG.exec(lineText)?.[5];
    const file = metadataCache.getFirstLinkpathDest(decodeURIComponent(internalFileName), '');

    // console.log(file.path);
    if (file === null) {
      return {
        linkText: internalFileName,
        altText: internalAltName,
        path: '',
        filepath: '',
      };
    } else {
      const imagePath = getPathOfImage(vault, file);
      const filePath = file.path;
      if (internalAltName) {
        return {
          linkText: internalFileName,
          altText: internalAltName,
          path: imagePath,
          filepath: filePath,
        };
      } else {
        return {
          linkText: internalFileName,
          altText: '',
          path: imagePath,
          filepath: filePath,
        };
      }
    }
  };

  const detectMDInternalLink = (lineText: string): LinkMatch | null => {
    const { metadataCache, vault } = appStore.getState().dailyNotesState.app;
    const internalFileName = MARKDOWN_URL_REG.exec(lineText)?.[5];
    const internalAltName = MARKDOWN_URL_REG.exec(lineText)?.[2];
    const file = metadataCache.getFirstLinkpathDest(decodeURIComponent(internalFileName), '');
    if (file === null) {
      return {
        linkText: internalFileName,
        altText: internalAltName,
        path: '',
        filepath: '',
      };
    } else {
      const imagePath = getPathOfImage(vault, file);
      const filePath = file.path;
      if (internalAltName) {
        return {
          linkText: internalFileName,
          altText: internalAltName,
          path: imagePath,
          filepath: filePath,
        };
      } else {
        return {
          linkText: internalFileName,
          altText: '',
          path: imagePath,
          filepath: filePath,
        };
      }
    }
  };

  let externalImageUrls = [] as string[];
  const internalImageUrls = [];
  let allMarkdownLink: string | any[] = [];
  let allInternalLink = [] as any[];
  if (IMAGE_URL_REG.test(memo)) {
    let allExternalImageUrls = [] as string[];
    const anotherExternalImageUrls = [] as string[];
    if (MARKDOWN_URL_REG.test(memo)) {
      allMarkdownLink = Array.from(memo.match(MARKDOWN_URL_REG));
      }
    if (WIKI_IMAGE_URL_REG.test(memo)) {
      allInternalLink = Array.from(memo.match(WIKI_IMAGE_URL_REG));
    }
    // const allInternalLink = Array.from(memo.content.match(WIKI_IMAGE_URL_REG));
    if (MARKDOWN_WEB_URL_REG.test(memo)) {
      allExternalImageUrls = Array.from(memo.match(MARKDOWN_WEB_URL_REG));
    }
    if (allInternalLink.length) {
      for (let i = 0; i < allInternalLink.length; i++) {
        const allInternalLinkElement = allInternalLink[i];
        internalImageUrls.push(detectWikiInternalLink(allInternalLinkElement));
      }
    }
    if (allMarkdownLink.length) {
      for (let i = 0; i < allMarkdownLink.length; i++) {
        const allMarkdownLinkElement = allMarkdownLink[i];
          if (/(.*)http[s]?(.*)/.test(allMarkdownLinkElement)) {
              anotherExternalImageUrls.push([...(allMarkdownLinkElement as string).matchAll(MARKDOWN_URL_REG)][0]?.[5]);
        } else {
          internalImageUrls.push(detectMDInternalLink(allMarkdownLinkElement));
        }
      }
    }
    externalImageUrls = allExternalImageUrls.concat(anotherExternalImageUrls);
    // externalImageUrls = Array.from(memo.content.match(IMAGE_URL_REG) ?? []);
  }

  return (
    <>
      <Only when={externalImageUrls.length > 0}>
        <div className="images-wrapper" style={imageGridStyles}>
          {externalImageUrls.map((imgUrl, idx) => (
            <div key={idx} style={imageItemStyles}>
              <Image
                alt=""
                className="memo-img"
                imgUrl={imgUrl}
                referrerPolicy="no-referrer"
                style={imageStyle}
              />
            </div>
          ))}
        </div>
      </Only>
      <Only when={internalImageUrls.length > 0}>
        <div className="images-wrapper internal-embed image-embed is-loaded" style={imageGridStyles}>
          {internalImageUrls.map((imgUrl, idx) => (
            <div key={idx} style={imageItemStyles}>
              <Image
                key={idx}
                className="memo-img"
                imgUrl={imgUrl.path}
                alt={imgUrl.altText}
                filepath={imgUrl.filepath}
                style={imageStyle}
              />
            </div>
          ))}
        </div>
      </Only>
    </>
  );
};

export default MemoImage;
