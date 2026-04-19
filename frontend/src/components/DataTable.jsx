import Loading from './Loading.jsx';

export default function DataTable({ columns, rows, loading, empty = 'No records found', rowKey = 'id', actions }) {
  if (loading) return <Loading label="Loading records" />;

  return (
    <div className="overflow-x-auto rounded border border-line bg-white shadow-soft scrollbar-thin">
      <table className="min-w-full divide-y divide-line">
        <thead className="bg-field">
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-gray-600">
                {column.header}
              </th>
            ))}
            {actions ? <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-normal text-gray-600">Actions</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows?.length ? rows.map((row) => (
            <tr key={row[rowKey]} className="hover:bg-gray-50">
              {columns.map((column) => (
                <td key={column.key} className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
              {actions ? <td className="px-4 py-3 text-right text-sm">{actions(row)}</td> : null}
            </tr>
          )) : (
            <tr>
              <td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-12 text-center text-gray-500">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
