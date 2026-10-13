import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from '../common/icons';

export function BackLink({ to = '/dashboard/admin', children = 'Dashboard' }: { to?: string; children?: string }) {
  return (
    <Link to={to} className="btn-secondary btn-sm">
      <ArrowLeftIcon className="h-3.5 w-3.5" />
      {children}
    </Link>
  );
}
