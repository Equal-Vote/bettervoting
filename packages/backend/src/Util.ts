import { Request, Response } from 'express';
import { reqIdSuffix } from './IRequest';
import ServiceLocator from './ServiceLocator';
import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';

export function assertNotNull<Type>(data:Type | null, message:string = 'unexpected null'):Type {
    if (data == null){
        throw(new Error(message));
    }
    return data;
}

export function orDefault<T>(data: T | null, def:T):T {
    if (data == null){
      return def;
    }
    return data;
  }

export function responseErr(res:Response, req:Request, code:number, errMessage:string, extraData?:any){
  errMessage += reqIdSuffix(req);
  if (extraData == null){
    extraData = {};
  }
  extraData.error = errMessage;
  return res.status(code).json(extraData);
}

interface ImageKitLayer{
  [key: string]: string | number
}
const formatImageKitURL = (layers: ImageKitLayer[]) : string => {
  return [
    'https://ik.imagekit.io/equalvote/tr:',
    ...layers.map(
      l => [
        l['type'],
        ...[Object.entries(l).filter(([k, v]) => k != 'type').map(([k, v]) => `${k}-${encodeURIComponent(v)}`)],
        ((l['type'] as string).startsWith('l')? 'l-end' : '')
      ].join(',')
    ).join(':'),
    '/media_preview.png'
  ].join('')
}

// copied from front end util.tsx
const truncName = (name: string, maxSize: number) => {
  if (!(typeof name === 'string')) return name;
  if (name.length <= maxSize) return name;
  return name.slice(0, maxSize - 3).concat("...");
};

interface TagObject{
  [key: string]: string
}
let ElectionsModel =  ServiceLocator.electionsDb();
export async function getMetaTags(req: any) : Promise<TagObject>  {
  let parts = req.url.split('/');
  let election:Election|null;

  // list copied from App.tsx
  if(['', 'about', 'invitations', 'manage', 'vote_history', 'browse', 'sandbox'].includes(parts[1].split('?')[0])){
    election = null;
  }else{
    const electionID = (parts[1] == 'Election' ? parts[2] : parts[1])
    try{
      election = await ElectionsModel.getElectionByID(electionID, req);
    } catch (err:any) {
      election = null;
    }
  }

  let race = election?.races?.[0] ?? undefined;
  let len = race?.candidates.length ?? 0;
  let n_hidden = (len > 5) ? 1 : (5-len);
  let n_cropped = (len > 5) ? 0 : (5-len);

  return {
      __META_TITLE__: election?.title ?? 'BetterVoting | Create elections & polls that don\'t spoil the vote',
      __META_DESCRIPTION__: election?.description ?? "Create secure elections with voting methods that don't spoil the vote.",
      __META_IMAGE__: election == null ?
        'https://assets.nationbuilder.com/unifiedprimary/pages/1470/attachments/original/1702692040/Screenshot_2023-12-15_at_6.00.24_PM.png?1702692040' :
        // https://imagekit.io/docs/transformations#position-of-layer
        // https://imagekit.io/docs/add-overlays-on-images#list-of-supported-text-transformations-in-text-layers
        formatImageKitURL([
          // Draw the election title
          {
            type: 'l-text',
            i: election?.title,
            w: 900,
            lx: 500-(900/2),
            ly: 180,
            fs: 45,
            ff: 'Montserrat-Black.ttf',
          },
          // Hide the unused rows
          {
            type: 'l-image',
            i: 'ik_canvas',
            bg: 'FFFFFF',
            lfo: 'bottom_left',
            w: 1000,
            h: 22+n_hidden*110+((n_hidden%2 == 0) ? -10 : 10),
          },
          // Draw the candidates from the first race
          ...(race?.candidates.slice(0,5).map((c, i) => ({
            type: 'l-text',
            i: (i == 4 && ((race?.candidates.length ?? 0) > 5))? `+${(race?.candidates.length ?? 0) - 4} more` : truncName(c.candidate_name, 40),
            w: 400,
            lx: 30,
            ly: 450+i*110
            // HACK: this will help center candidates when they only need 1 line to spell the name
              +(((len ?? 0) < 27)? 20 : 0),
            fs: 30,
            ia: 'left',
            ff: 'Montserrat-Black.ttf',
          })) ?? []),
          // Crop out the unused rows
          {
            type: 'cm-extract',
            w: 1000,
            h: 1000 - n_cropped*110,
            x: 0,
            y: 0,
          },
        ])
  };
}