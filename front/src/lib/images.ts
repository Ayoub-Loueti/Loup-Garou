import loupGarouImg from '../image/Loup-Garou.png';
import voyanteImg from '../image/voyante.png';
import sorcierImg from '../image/Sorciere.png';
import chasseurImg from '../image/chasseur.png';
import villageoisImg from '../image/villageois.png';
import salvateurImg from '../image/salvvateurr.jpg';
import type { Role } from '../types/game';

export const ROLE_IMAGES: Record<Role, string> = {
  loup_garou: loupGarouImg,
  voyante: voyanteImg,
  sorciere: sorcierImg,
  chasseur: chasseurImg,
  villageois: villageoisImg,
  salvateur: salvateurImg,
};
