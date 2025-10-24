
const SvgrMock = (
  {
    ref,
    ...props
  }
) => (<svg ref={ref} {...props} />);

SvgrMock.displayName = 'SvgrMock';

export const ReactComponent = SvgrMock;
export default SvgrMock;
